import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { toAuthUser } from "../auth/jwt-user";

@Injectable()
export class JwtAuthGuard implements CanActivate{
    constructor(private jwtService: JwtService){}
    
    async canActivate(context: ExecutionContext): Promise<boolean>{
        const request = context.switchToHttp().getRequest();

        const authHeader = request.headers.authorization;

        if (!authHeader){
            throw new UnauthorizedException('User not authorized');
        }

        const bearer = authHeader.split(' ')[0];
        const token = authHeader.split(' ')[1];

        if (bearer !== 'Bearer' || !token) {
            throw new UnauthorizedException('Incorrect user formate');
        }

        try {
            const user = toAuthUser(await this.jwtService.verifyAsync(token));

            if (!user) {
                throw new UnauthorizedException('Token is invalid or expired');
            }

            request.user = user;
            return true;
        }catch(e){
            throw new UnauthorizedException('Token is invalid or expired');
        }
    }
}
