import { Body, Controller, Delete, Get, Injectable, Module, Param, Post } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import { AuthUser, CurrentUser } from '../common/decorators';

class CreateFamilyMemberDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ example: 'spouse | child | parent | other' }) @IsString() relation!: string;
  @ApiProperty({ required: false, description: 'ISO date' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;
  @ApiProperty({ default: true }) @IsOptional() @IsBoolean() isDependent = true;
}

@Injectable()
class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async list(userId: string) {
    const rows = await this.prisma.familyMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    // Member names are PII — decrypt at the application layer before returning.
    return rows.map((m) => ({
      id: m.id,
      name: this.crypto.decrypt(m.name),
      relation: m.relation,
      dateOfBirth: m.dateOfBirth,
      isDependent: m.isDependent,
    }));
  }

  async create(userId: string, dto: CreateFamilyMemberDto) {
    const m = await this.prisma.familyMember.create({
      data: {
        userId,
        name: this.crypto.encrypt(dto.name)!,
        relation: dto.relation,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        isDependent: dto.isDependent ?? true,
      },
    });
    await this.syncDependents(userId);
    return { id: m.id };
  }

  async remove(userId: string, id: string) {
    await this.prisma.familyMember.deleteMany({ where: { id, userId } });
    await this.syncDependents(userId);
    return { ok: true };
  }

  /**
   * Keep Profile.dependents in lock-step with the family graph so the dependent
   * count feeds insurance-gap and Early Warning calculations automatically.
   * Uses updateMany so it's a no-op until the user has a profile (avoids needing
   * the required, encrypted profile fields just to bump a counter).
   */
  private async syncDependents(userId: string) {
    const dependents = await this.prisma.familyMember.count({
      where: { userId, isDependent: true },
    });
    await this.prisma.profile.updateMany({ where: { userId }, data: { dependents } });
  }
}

@ApiTags('family')
@Controller('family')
class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.family.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFamilyMemberDto) {
    return this.family.create(user.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.family.remove(user.id, id);
  }
}

@Module({
  controllers: [FamilyController],
  providers: [FamilyService],
})
export class FamilyModule {}
