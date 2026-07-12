import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Room naming convention: `user:<userId>` — every connected client joins its own room
// by sending its userId right after connecting. This keeps it simple for Phase 3;
// later phases can add role-based rooms (e.g. `role:HR_ADMIN`) the same way.
@WebSocketGateway({ cors: { origin: '*' } })
export class EnrolmentsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string | undefined;
    if (userId) {
      client.join(`user:${userId}`);
    }
  }

  notifyManagerOfCompletion(managerId: string, payload: {
    employeeName: string;
    courseTitle: string;
  }) {
    this.server.to(`user:${managerId}`).emit('team-member-completed-course', payload);
  }
}