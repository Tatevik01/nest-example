import { StatusType } from './../entities/orders.entity';

interface IPaymentMethod {
  name: string;
  id: string;
  img: string;
}

export class requestNewPaymentDTO {
  amount: string;
  currency: string;
  email: string;
  purpose: string;
  phone: string;
  cartId: string;
  userId: string;
  shippingMethod: {
    Id: number;
    Name: string;
    Description: string;
    ShippingCost: string;
    IconUrl: string;
    Key: string;
  };
  lastName: string;
  firstName: string;
  country: string;
  address1: string;
  address2: string;
  city: string;
  postcode: string;
  orderId: string;
  payment_methods: IPaymentMethod[];
  merchantFee: string;
  subtotal: string;
}

export class successNewPaymentDTO {
  payment_id: string;
  payment_request_id: string;
  phone: string;
  amount: string;
  currency: string;
  status: string;
  hmac: string;
}

export class canceledPaymentDTO {
  payment: string;
}

export class createNewOrderDTO {
  cognitoId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export class selectShippingMethodDTO {
  orderId: string;
  selectedShippingMethod: string;
}

export class updateAndSaveOrderStatusDTO {
  orderId: string;
  status: StatusType;
}