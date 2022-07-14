import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carts } from '../carts/entities/carts.entity';
import { Payments } from '../payments/entities/payments.entity';
import { Shipping } from '../shipping/entities/shipping.entity';
import { ShippingProviders } from '../shipping_providers/entities/shipping_providers.entity';
import { Skus } from '../skus/entities/skus.entity';
import { SkusToCart } from '../skustocart/entities/skustocart.entity';
import { Users } from '../users/entities/users.entity';
import { OrdersController } from './controller/orders.controller';
import { Orders } from './entities/orders.entity';
import { OrdersService } from './services/orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    TypeOrmModule.forFeature([
      Orders,
      Users,
      Carts,
      SkusToCart,
      Shipping,
      ShippingProviders,
      Skus,
      Payments
    ]),
  ],
})
export class OrdersModule {}
