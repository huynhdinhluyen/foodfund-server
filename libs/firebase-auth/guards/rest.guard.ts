import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FirebaseAuthGuard extends AuthGuard('firebase-auth') {
  getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }
}
