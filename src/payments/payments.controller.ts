import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { LiqPayService } from './liqpay/liqpay.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
    constructor(private readonly liqpayService: LiqPayService){}

    @Post('generate')
    generatePayment(@Body() dto: CreatePaymentDto){
        return this.liqpayService.generatePaymentParams(dto.bookingId);
    }

    @Get('demo-checkout/:bookingId')
    async renderDemoCheckout(@Param('bookingId') bookingId: string, @Res() res: Response) {
        
        const paymentParams = await this.liqpayService.generatePaymentParams(bookingId);

        const html = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <title>Test LiqPay</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .checkout-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
                h2 { color: #333; margin-bottom: 10px; }
                p { color: #777; margin-bottom: 30px; }
                .pay-btn { background: #77CC5D; color: white; border: none; padding: 15px 30px; font-size: 18px; border-radius: 8px; cursor: pointer; transition: background 0.3s ease; width: 100%; font-weight: bold; }
                .pay-btn:hover { background: #65b04c; }
            </style>
        </head>
        <body>
            <div class="checkout-card">
                <h2>Booking payment #${bookingId}</h2>
                <p>You will be transfered to safe gateway LiqPay</p>
                
                <form method="POST" action="https://www.liqpay.ua/api/3/checkout" accept-charset="utf-8">
                    <input type="hidden" name="data" value="${paymentParams.data}" />
                    <input type="hidden" name="signature" value="${paymentParams.signature}" />
                    
                    <button type="submit" class="pay-btn">Pay</button>
                </form>
            </div>
        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    }

    @Post('callback')
    @HttpCode(HttpStatus.OK)
    handleCallBack(@Body() body: { data: string; signature: string}){
        console.log('--- LiqPay WebHook ---');

        return this.liqpayService.processPaymentCallback(body.data, body.signature);
    }
}
