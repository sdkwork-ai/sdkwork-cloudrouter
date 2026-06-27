import type { I18nMessageBundle } from '../types';

export const adminCommerceInventoryMessages = {
  en: {
    "admin.commerce.inventory.title": "Inventory",
    "admin.commerce.inventory.desc": "Stock, reservations, and immutable inventory ledger.",
    "admin.commerce.inventory.empty": "No inventory records",
    "admin.commerce.inventory.error": "Inventory data could not be loaded",
    "admin.commerce.inventory.loading": "Loading inventory records...",
    "admin.commerce.inventory.group.inventory": "Inventory",
    "admin.commerce.inventory.stocks.title": "Stock",
    "admin.commerce.inventory.stocks.desc": "Inventory stock by SKU and warehouse.",
    "admin.commerce.inventory.reservations.title": "Reservations",
    "admin.commerce.inventory.reservations.desc": "Checkout and order inventory reservations.",
    "admin.commerce.inventory.ledger.title": "Inventory Ledger",
    "admin.commerce.inventory.ledger.desc": "Immutable stock movement audit entries.",
  },
  zh: {
    "admin.commerce.inventory.title": "库存管理",
    "admin.commerce.inventory.desc": "库存、预留和不可变库存流水。",
    "admin.commerce.inventory.empty": "暂无库存记录",
    "admin.commerce.inventory.error": "库存数据加载失败",
    "admin.commerce.inventory.loading": "正在加载库存数据...",
    "admin.commerce.inventory.group.inventory": "库存",
    "admin.commerce.inventory.stocks.title": "库存查询",
    "admin.commerce.inventory.stocks.desc": "按SKU和仓库维度的库存。",
    "admin.commerce.inventory.reservations.title": "库存预留",
    "admin.commerce.inventory.reservations.desc": "结算和订单的库存预留。",
    "admin.commerce.inventory.ledger.title": "库存流水",
    "admin.commerce.inventory.ledger.desc": "不可变的库存变动审计记录。",
  },
} satisfies I18nMessageBundle;
