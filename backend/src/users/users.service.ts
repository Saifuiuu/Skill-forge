import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: CreateUserDto & { password: string }): Promise<User> {
    const hashedPassword = userData.password.startsWith('$2')
      ? userData.password
      : await bcrypt.hash(userData.password, 10);

    const user = this.usersRepository.create({
      fullName: userData.fullName,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      team: userData.teamId ? { id: userData.teamId } : null,
    });
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: { team: { department: { company: true } } },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        password: false,
        refreshTokenHash: false,
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { team: { department: { company: true } } },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: { team: { department: { company: true } } },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    if (updateUserDto.teamId) {
      user.team = { id: updateUserDto.teamId } as User['team'];
    }
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { refreshTokenHash });
  }

  async findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  sanitizeUser(user: User) {
    const { password, refreshTokenHash, ...safe } = user;
    return safe;
  }
}
