alter table public.payment_orders
  alter column payment_type set default 'alipay';

alter table public.payment_orders
  drop constraint if exists payment_orders_payment_type_check;

alter table public.payment_orders
  add constraint payment_orders_payment_type_check
  check (payment_type in ('alipay'));
