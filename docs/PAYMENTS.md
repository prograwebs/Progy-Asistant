# Suscripciones y cobros

La versión Platform V1 separa **planes y capacidades** del proveedor de pago. Esto evita amarrar el producto a una pasarela antes de tener la cuenta comercial y credenciales definitivas.

## Estado actual

La plataforma ya tiene:

- `trial`, `business` y `pro` como códigos de plan;
- límites de pruebas, catálogo, historial y funciones en `lib/billing/entitlements.ts`;
- `business_plans` como fuente del plan activo del negocio;
- consumo por negocio en `usage_ledger`;
- interfaz de Consumo y plan.

El Módulo 5 agrega un registro interno de cobros para administradores. No es un checkout: un administrador puede registrar manualmente una transferencia, efectivo u otro método desde `/admin/billing`, y el servidor activa el plan mediante una función transaccional. Los clientes no pueden marcar sus propias facturas como pagadas.

## Contrato recomendado para una pasarela

Cuando PrograWebs elija el proveedor, crear:

```text
lib/billing/provider.ts
app/api/billing/checkout/route.ts
app/api/billing/webhook/route.ts
app/api/billing/portal/route.ts
```

El adaptador debe exponer como mínimo:

```ts
createCheckout({ businessId, planCode, userId })
verifyWebhook(request)
cancelSubscription(externalSubscriptionId)
getCustomerPortal(externalCustomerId)
```

## Regla de seguridad

El navegador **solicita** un checkout, pero nunca activa un plan. El plan cambia únicamente cuando el servidor recibe y valida el evento de pago del proveedor.

Flujo:

```text
Usuario elige plan
  -> servidor crea checkout
  -> proveedor cobra
  -> webhook firmado
  -> servidor valida evento
  -> business_plans se actualiza
  -> dashboard refleja nuevas capacidades
```

## Datos sugeridos

`business_plans` debería poder almacenar, cuando se conecte el proveedor:

- `plan_code`
- `status`
- `billing_provider`
- `external_customer_id`
- `external_subscription_id`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `included_voice_seconds`
- `used_voice_seconds`

No guardar números completos de tarjeta ni datos sensibles de pago en Progy.

## Antes de implementar

Confirmar:

1. proveedor disponible legal/comercialmente para la cuenta que cobrará;
2. soporte para cobro recurrente en Ecuador y moneda requerida;
3. comisiones reales;
4. requisitos de RUC/empresa/cuenta bancaria;
5. manejo de IVA/facturación que corresponda a PrograWebs;
6. webhooks y entorno sandbox.

La UI de clientes no presenta checkout ni botón de pago. La pantalla administrativa solo registra cobros ya recibidos; la integración de pasarela, webhooks, prorrateo, notificaciones y factura electrónica siguen fuera de alcance.
