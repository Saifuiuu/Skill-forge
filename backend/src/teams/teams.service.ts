import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepo: Repository<Team>,
  ) {}

  create(_createTeamDto: CreateTeamDto) {
    return 'This action adds a new team';
  }

  findAll() {
    return this.teamsRepo.find({
      relations: { department: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const team = await this.teamsRepo.findOne({
      where: { id },
      relations: { department: true, members: true },
    });
    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }
    return team;
  }

  update(id: string, _updateTeamDto: UpdateTeamDto) {
    return `This action updates a #${id} team`;
  }

  remove(id: string) {
    return `This action removes a #${id} team`;
  }
}
