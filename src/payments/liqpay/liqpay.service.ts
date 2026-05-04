import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LiqPayService {

    constructor(private prisma: PrismaService){}

    private readonly publicKey = process.env.LIQPAY_PUBLIC_KEY;
    private readonly privateKey = process.env.LIQPAY_PRIVATE_KEY;

    async generatePaymentParams(bookingId: string){
        const bookingInfo = await this.prisma.booking.findUnique({
            where: {id: bookingId},
            select: {totalPrice: true, status: true}
        });

        if(!bookingInfo){
            throw new NotFoundException(`Booking ${bookingId} not found`);
        }

        switch (bookingInfo.status) {
            case 'PENDING':
                throw new ForbiddenException('Booking is not approved yet');
            case 'CANCELLED':
                throw new ForbiddenException('Booking is canceled');
            case 'COMPLETED':
                throw new ConflictException('Booking is completed');
            default:
                break;
        }

        const newPayment = await this.prisma.payment.create({
            data:{
                bookingId: bookingId,
                amount: bookingInfo.totalPrice,
            }
        })

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const dynamicResultUrl = `${frontendUrl}/bookings/${bookingId}`

        const params = {
            public_key: this.publicKey,
            version: 3,
            action: 'pay',
            amount: bookingInfo.totalPrice,
            currency: 'UAH',
            description: `Apartment payment (Booking #${bookingId})`,
            order_id: newPayment.id,
            server_url: process.env.LIQPAY_WEBHOOK_URL,
            result_url: dynamicResultUrl,
        }
        const jsonString = JSON.stringify(params);
        const data = Buffer.from(jsonString).toString('base64');

        const signString = this.privateKey + data + this.privateKey;
        const signature = crypto.createHash('sha1').update(signString).digest('base64');

        return {
            data,
            signature
        };
    }

    verifySignature(data: string, incomingSignature: string): boolean {
        const signString = this.privateKey + data + this.privateKey;
        const expectedSignature = crypto.createHash('sha1').update(signString).digest('base64');

        return incomingSignature === expectedSignature;
    }

    async processPaymentCallback(data: string, signature: string){
        const isValid = this.verifySignature(data, signature);
        
        if(isValid === false){
            console.error('Safety error: invalid signature!');
            return {
                status: 'error',
                message: 'Invalid signature'
            }
        }

        const decodedString = Buffer.from(data, 'base64').toString('utf-8');
        const paymentData = JSON.parse(decodedString);

        const orderId = paymentData.order_id;
        const liqpayStatus = paymentData.status;

        const liqpayTransactionId = paymentData.payment_id

        console.log(`Payment data: ${paymentData.order_id} status: ${paymentData.status}`);

        if(liqpayStatus === 'success' || liqpayStatus === 'sandbox'){
            console.log(`Booking ${orderId} payed successfully`);
            try{
                await this.prisma.payment.update({
                    where:{
                        id: orderId
                    },
                    data:{
                        status: 'SUCCESS',
                        providerPaymentId: String(liqpayTransactionId)
                    }
                });
            }catch(error){
                console.error('Webhook DB Error:', error);
            }
        }

        if(liqpayStatus === 'failure'){
            console.log(`Booking ${orderId} payment failed `);
            try{
                await this.prisma.payment.update({
                    where:{
                        id: orderId
                    },
                    data:{
                        status: 'FAILED',
                        providerPaymentId: String(liqpayTransactionId)
                    }
                });
            }catch(error){
                console.error('Webhook DB Error:', error);;
            }
        }

        return {status: 'success'};
    }
}
