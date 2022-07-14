import { Cards } from 'src/modules/cards/entities/cards.entity';
import { ShippingProviders } from 'src/modules/shipping_providers/entities/shipping_providers.entity';
import { SkusToCart } from 'src/modules/skustocart/entities/skustocart.entity';
import { Users } from 'src/modules/users/entities/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Carts } from './../../carts/entities/carts.entity';
import { Shipping } from './../../shipping/entities/shipping.entity';

interface IOrderItem {
  Id: number;
  Quantity: number;
  SkuId: {
    Color: string;
    Description: string;
    Id: number;
    IsDefault: boolean;
    Name: string;
    Price: string;
    Size: string;
  };
}

interface IShippingProvider {
  Id: number;
  Description: string;
  IconUrl: string;
  Key: string;
  Name: string;
  ShippingCost: string;
}

interface IShippingDetails {
  address1: string;
  address2: string;
  city: string;
  country: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  postcode: string; 
}

export type StatusType = 'completed' | 'canceled' | 'pending' | 'draft';

@Entity()
export class Orders {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ nullable: true, default: null })
  ReferenceId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  Amount: string;

  @Column('simple-json', { nullable: true })
  ShippingDetails: null | IShippingDetails;

  @Column({ default: '' })
  PromocodeId: string;

  @Column()
  CartId: string;

  @Column({ 
    type: "enum", 
    enum: ['completed', 'canceled', 'pending', 'draft'], 
    default: 'draft' 
  })
  Status: StatusType;

  @Column('simple-json', { nullable: true, default: null })
  ShippingProviderId: null | ShippingProviders;

  @ManyToOne((type) => Users)
  @JoinColumn({ name: 'UserId' })
  UserId: Users;

  @ManyToOne(() => ShippingProviders)
  @JoinColumn()
  ShippingProviderData: ShippingProviders;

  @CreateDateColumn({ name: 'CreatedDate' })
  CreatedDate: Date;

  @Column('simple-json', { nullable: true, default: null })
  OrderItems: null | SkusToCart[];
}
