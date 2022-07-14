import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Response } from 'express';
import * as FormData from 'form-data';
import { Carts } from 'src/modules/carts/entities/carts.entity';
import SuccessfulOrderTemplate from 'src/modules/notifications/successfull_order_template';
import SuccessfulPaymentTemplate from 'src/modules/notifications/successfull_payment_template';
import { Payments } from 'src/modules/payments/entities/payments.entity';
import { Shipping } from 'src/modules/shipping/entities/shipping.entity';
import { ShippingProviders } from 'src/modules/shipping_providers/entities/shipping_providers.entity';
import { Skus } from 'src/modules/skus/entities/skus.entity';
import { SkusToCart } from 'src/modules/skustocart/entities/skustocart.entity';
import { Users } from 'src/modules/users/entities/users.entity';

import { Repository } from 'typeorm';
import {
  canceledPaymentDTO,
  createNewOrderDTO,
  requestNewPaymentDTO,
  selectShippingMethodDTO,
  successNewPaymentDTO,
  updateAndSaveOrderStatusDTO
} from '../controller/ordersDTO';
import { Orders } from '../entities/orders.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Orders)
    private ordersRepository: Repository<Orders>,
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
    @InjectRepository(Carts)
    private cartsRepository: Repository<Carts>,
    @InjectRepository(ShippingProviders)
    private shippingProviderRepository: Repository<ShippingProviders>,
    @InjectRepository(Shipping)
    private shippingRepository: Repository<Shipping>,
    @InjectRepository(SkusToCart)
    private skusToCartRepository: Repository<SkusToCart>,
    @InjectRepository(Skus)
    private skusRepository: Repository<Skus>,
    @InjectRepository(Payments)
    private paymentsRepository: Repository<Payments>
  ) {}

  async getAllOrders() {
    try {
      const orders = await this.ordersRepository.find();
      return orders;
    } catch (e) {
      return {
        error: e,
      };
    }
  }

  async getAllByUserId(id: string) {
    try {
      const user = await this.usersRepository.findOne({
        where: {
          CognitoId: id,
        },
      });

      if (user) {
        const orders = await this.ordersRepository.find({
          where: {
            UserId: user,
          },
        });

        return orders;
      } else {
        return {
          message: 'No such user',
        };
      }
    } catch (e) {
      return {
        error: e,
      };
    }
  }

  async getOrdersById(id: string) {
    try {
      const orders = await this.ordersRepository.findOne({
        where: {
          ReferenceId: id,
        },
      });

      return orders;
    } catch (e) {
      return {
        error: e,
      };
    }
  }

  async getOrderByOrderId(id: string) {
    try {
      const order = await this.ordersRepository.findOne(id, {
        where: {},
        relations: ['ShippingProviderData'],
      });

      return order;
    } catch (e) {
      return {
        error: e.message,
      };
    }
  }

  async updateAndSave(orderBody: updateAndSaveOrderStatusDTO) {
    try {
      const { orderId, status } = orderBody;

      const orderExist = await this.ordersRepository.findOne({
        where: {
          Id: orderId,
        },
      });

      if (!orderExist) {
        return new BadRequestException('No such order');
      }

      await this.ordersRepository.update(orderId, {
        Status: status,
      });

      return {
        message: 'success',
      };
    } catch (e) {
      return {
        error: e.message,
      };
    }
  }

  async requestNewPayment(
    requestPaymentBody: requestNewPaymentDTO,
    host: string,
    ref: string
  ) {
    try {
      const order = await this.ordersRepository.findOne(
        requestPaymentBody.orderId
      );
      const user = await this.usersRepository.findOne({
        where: { CognitoId: requestPaymentBody.userId },
      });

      const cartItems = await this.skusToCartRepository.find({
        where: {
          CartId: requestPaymentBody.cartId,
        },
        relations: ['SkuId'],
      });

      const newPaymentRecord = new Payments();
      newPaymentRecord.PaymentId = '';
      newPaymentRecord.UserId = user;
      newPaymentRecord.Status = 'pending';
      newPaymentRecord.Total = requestPaymentBody.amount;
      newPaymentRecord.MerchantFee = requestPaymentBody.merchantFee;
      newPaymentRecord.Subtotal = requestPaymentBody.subtotal;

      await this.paymentsRepository.save(newPaymentRecord);

      const updatedOrder = await this.ordersRepository.update(order.Id, {
        Amount: requestPaymentBody.amount,
        CartId: requestPaymentBody.cartId,
        ShippingDetails: {
          email: requestPaymentBody.email,
          phone: requestPaymentBody.phone,
          firstName: requestPaymentBody.firstName,
          lastName: requestPaymentBody.lastName,
          country: requestPaymentBody.country,
          address1: requestPaymentBody.address1,
          address2: requestPaymentBody.address2,
          city: requestPaymentBody.city,
          postcode: requestPaymentBody.postcode,
        },
        OrderItems: cartItems,
        ShippingProviderId: requestPaymentBody.shippingMethod,
      });

      const userData = new FormData();
      
      userData.append('amount', requestPaymentBody.amount);
      userData.append('currency', 'SGD');
      userData.append('email', requestPaymentBody.email);
      userData.append('purpose', `Payment for Order #${newPaymentRecord.Id}`);
      userData.append('redirect_url', `${ref}payment`);
      userData.append('webhook', `https://${host}/api/orders/payment_hook`);

      for (var i = 0; i < requestPaymentBody.payment_methods.length; i++) {
        userData.append(
          'payment_methods[]',
          requestPaymentBody.payment_methods[i].id
        );
      }

      const headers = {
        'X-BUSINESS-API-KEY': process.env.HITPAY_API_KEY,
        'X-Requested-With': 'XMLHttpRequest',
        ...userData.getHeaders(),
      };

      const requestPaymentResponse = await axios
        .post(process.env.HITPAY_LINK, userData, {
          headers: headers,
        })
        .then((res) => {
          return res.data;
        })
        .catch((res) => {
          return res;
        });

      if (requestPaymentResponse && user) {
        const updating = await this.ordersRepository.update(order.Id, {
          UserId: user,
          ReferenceId: requestPaymentResponse.id,
          Status: requestPaymentResponse.status,
        });

        await this.paymentsRepository.update(newPaymentRecord.Id, {
          PaymentId: requestPaymentResponse.id,
        });
      }

      return requestPaymentResponse;
    } catch (e) {
      return {
        error: e,
        message: 'HITPAY ORDER CREATION ERROR',
      };
    }
  }

  private async sendOrderConfirmationEmail(
    requestPaymentBody: successNewPaymentDTO,
    user: Users,
    userOrder: Orders,
    cart: Carts,
    payment: Payments
  ) {
    try {
      const skus = await this.skusToCartRepository.find({
        where: { CartId: cart.Id },
        relations: ['SkuId'],
      });

      const shippingProvider = await this.shippingProviderRepository.findOne(
        userOrder.ShippingProviderId
      );

      const shippingDetails = await this.shippingRepository.findOne({
        where: { UserId: user },
      });

      const email = new SuccessfulOrderTemplate(
        userOrder,
        user,
        shippingProvider,
        shippingDetails,
        skus,
        requestPaymentBody,
        payment
      );

      await email.send();
    } catch (e) {
      return {
        e,
      };
    }
  }

  private async sendPaymentConfirmationEmail(
    requestPaymentBody: successNewPaymentDTO,
    user: Users,
    userOrder: Orders,
    cart: Carts,
    payment: Payments
  ) {
    try {
      const skus = await this.skusToCartRepository.find({
        where: { CartId: cart.Id },
        relations: ['SkuId'],
      });

      const shippingProvider = await this.shippingProviderRepository.findOne(
        userOrder.ShippingProviderId
      );

      const shippingDetails = await this.shippingRepository.findOne({
        where: { UserId: user.Id },
      });

      const email = new SuccessfulPaymentTemplate(
        userOrder,
        user,
        shippingProvider,
        shippingDetails,
        skus,
        requestPaymentBody,
        payment
      );
      await email.send();
    } catch (e) {
      return {
        e,
      };
    }
  }

  async selectShippingMethod(requestBody: selectShippingMethodDTO) {
    try {
      const order = await this.ordersRepository.findOne(requestBody.orderId);
      if (!order) {
        return {
          message: 'Order not found',
        };
      }
      const shippingMethod = await this.shippingProviderRepository.findOne(
        requestBody.selectedShippingMethod
      );

      const updated = await this.ordersRepository.update(order.Id, {
        ShippingProviderData: shippingMethod,
      });

      return {
        message: updated,
      };
    } catch (e) {
      return {
        error: e.message,
      };
    }
  }

  async paymentHook(requestBody: successNewPaymentDTO, response: Response) {
    if (requestBody.status == 'completed') {
      const order = await this.ordersRepository.findOne({
        where: { ReferenceId: requestBody.payment_request_id },
        relations: ['UserId'],
      });

      if (order.Status == 'completed') {
        return response.status(200).send('Already completed order');
      }

      const cart = await this.cartsRepository.findOne({
        where: { Id: order.CartId },
        relations: ['SkusToCart'],
      });

      const update = await cart.SkusToCart.forEach(async (cartItem) => {
        const skuToCart = await this.skusToCartRepository.findOne(cartItem.Id, {
          relations: ['SkuId'],
        });
        await this.skusRepository.update(skuToCart.SkuId.Id, {
          TotalQuantity: `${
            parseInt(skuToCart.SkuId.TotalQuantity) - skuToCart.Quantity
          }`,
          OrderedQuantity: `${
            parseInt(skuToCart.SkuId.OrderedQuantity) + skuToCart.Quantity
          }`,
        });
      });

      const updating = await this.ordersRepository.update(order.Id, {
        Status: requestBody.status,
      });

      const user = await this.usersRepository.findOne({
        where: { Id: order.UserId.Id },
      });

      const emptyOrder = new Orders();
      emptyOrder.UserId = user;
      emptyOrder.CartId = String(cart.Id);
      emptyOrder.Amount = '';
      emptyOrder.ShippingProviderId = null;
      emptyOrder.ShippingDetails = null;
      emptyOrder.OrderItems = null;
      emptyOrder.Status = 'draft';

      const newOrder = await this.ordersRepository.save(emptyOrder);

      const userUpdate = await this.usersRepository.update(user.Id, {
        Order: String(emptyOrder.Id),
      });

      const payment = await this.paymentsRepository.findOne({
        where: { PaymentId: requestBody.payment_request_id },
      });

      await this.sendPaymentConfirmationEmail(
        requestBody,
        user,
        order,
        cart,
        payment
      );

      const deleted = await this.skusToCartRepository.delete({ CartId: cart });
    }
    return response.status(200).send('Confirmed order');
  }

  async paymentCanceledHook(requestBody: canceledPaymentDTO) {
    try {
      const order = await this.ordersRepository.findOne({
        where: { ReferenceId: requestBody.payment },
      });

      const payment = await this.paymentsRepository.findOne({
        where: { PaymentId: requestBody.payment },
      });

      await this.ordersRepository.update(order.Id, {
        Status: 'canceled',
      });

      await this.paymentsRepository.update(payment.Id, {
        Status: 'canceled',
      });

      return {
        message: 'canceled',
      };
    } catch (e) {
      console.log(e);
      return {
        message: e,
      };
    }
  }
}
