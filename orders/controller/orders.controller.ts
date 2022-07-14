import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from '../services/orders.service';
import {
  canceledPaymentDTO,
  requestNewPaymentDTO,
  selectShippingMethodDTO,
  successNewPaymentDTO,
  updateAndSaveOrderStatusDTO
} from './ordersDTO';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('/all_orders')
  async getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Post('/shipping_select')
  async selectShippingMethod(@Body() requestBody: selectShippingMethodDTO) {
    return this.ordersService.selectShippingMethod(requestBody);
  }

  @Get('/user/:id')
  async getAllByUserId(@Param('id') id: string) {
    return this.ordersService.getAllByUserId(id);
  }

  @Get('/:id')
  async getOrderByRefId(@Param('id') id: string) {
    return this.ordersService.getOrdersById(id);
  }

  @Get('/order/:id')
  async getOrderByOrderId(@Param('id') id: string) {
    return this.ordersService.getOrderByOrderId(id);
  }

  @Post('/order/update')
  async updateAndSave(@Body() orderBody: updateAndSaveOrderStatusDTO) {
    const order = await this.ordersService.updateAndSave(orderBody);

    return order;
  }

  @Post('/request')
  async requestNewPayment(
    @Body() requestPaymentBody: requestNewPaymentDTO,
    @Headers('host') host: string,
    @Headers('referer') ref: string
  ) {
    return this.ordersService.requestNewPayment(requestPaymentBody, host, ref);
  }

  @Post('/payment_hook')
  async hitpayHook(
    @Body() requestBody: successNewPaymentDTO,
    @Res() response: Response
  ) {
    return this.ordersService.paymentHook(requestBody, response);
  }

  @Post('/payment_canceled')
  async paymentCancel(@Body() requestBody: canceledPaymentDTO) {
    return this.ordersService.paymentCanceledHook(requestBody);
  }
}
