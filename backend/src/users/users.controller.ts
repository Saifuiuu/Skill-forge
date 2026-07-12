import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.HR_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create user (HR Admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService
      .create(createUserDto as CreateUserDto & { password: string })
      .then((u) => this.usersService.sanitizeUser(u));
  }

  @Roles(UserRole.HR_ADMIN, UserRole.MANAGER)
  @Get()
  @ApiOperation({ summary: 'List users (HR Admin / Manager)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id).then((u) => this.usersService.sanitizeUser(u));
  }

  @Roles(UserRole.HR_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update user (HR Admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Roles(UserRole.HR_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (HR Admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
