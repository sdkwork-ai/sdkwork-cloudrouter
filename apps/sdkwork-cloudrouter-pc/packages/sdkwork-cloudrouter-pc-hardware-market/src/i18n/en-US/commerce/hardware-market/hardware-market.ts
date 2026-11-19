/**
 * Smart Hardware Market catalog - English (en-US).
 *
 * Mirror of `zh-CN/commerce/hardware-market/hardware-market.ts`: same key set,
 * same interpolation placeholders.
 */

export const hardwareMarketMessagesEn: Record<string, string> = {
  // ------------------------------------------------------------------- meta
  'hardwareMarket.meta.title': 'Smart Hardware Market',

  // ------------------------------------------------------------------- hero
  'hardwareMarket.badge': 'Powered by the Product Center',
  'hardwareMarket.hero.title': 'Smart Hardware Market',
  'hardwareMarket.hero.subtitle':
    'Devices, sensors, edge gateways, and accessories published from the Cloud Router Product Center. Browse the live catalog, compare variants, and check out with platform payment.',
  'hardwareMarket.hero.browse': 'Browse the catalog',
  'hardwareMarket.hero.manage': 'Manage in Product Center',
  'hardwareMarket.hero.stat.products': 'Products on sale',
  'hardwareMarket.hero.stat.categories': 'Categories',

  // ----------------------------------------------------------------- search
  'hardwareMarket.search.label': 'Search smart hardware',
  'hardwareMarket.search.placeholder': 'Search by product name, product number, or model',
  'hardwareMarket.search.submit': 'Search',
  'hardwareMarket.search.clear': 'Clear search',

  // ------------------------------------------------------------------- sort
  'hardwareMarket.sort.label': 'Sort by',
  'hardwareMarket.sort.newest': 'Newest arrivals',
  'hardwareMarket.sort.priceAsc': 'Price: low to high',
  'hardwareMarket.sort.priceDesc': 'Price: high to low',

  // --------------------------------------------------------------- category
  'hardwareMarket.category.label': 'Product categories',
  'hardwareMarket.category.all': 'All hardware',
  'hardwareMarket.results': '{{count}} products',

  // ------------------------------------------------------------------- card
  'hardwareMarket.card.from': 'From',
  'hardwareMarket.card.priceUnavailable': 'Price on request',
  'hardwareMarket.card.skuCount': '{{count}} variants',
  'hardwareMarket.card.view': 'View product',
  'hardwareMarket.card.taglineFallback': 'Published from the Cloud Router Product Center',
  'hardwareMarket.card.originalPrice': 'List price',
  'hardwareMarket.card.discount': '{{percent}}% off',

  // ------------------------------------------------------------------ state
  'hardwareMarket.state.loading': 'Loading the hardware catalog...',
  'hardwareMarket.state.error': 'The hardware catalog could not be loaded',
  'hardwareMarket.state.errorHint': 'Check your connection and try again. The Product Center service was not reachable.',
  'hardwareMarket.state.retry': 'Try again',
  'hardwareMarket.state.empty': 'No smart hardware has been published yet',
  'hardwareMarket.state.emptyHint': 'Operators publish hardware products in the Product Center, and they appear here immediately.',
  'hardwareMarket.state.noResults': 'No hardware matches the current filters',
  'hardwareMarket.state.noResultsHint': 'Try another keyword, category, or clear the filters.',

  // ------------------------------------------------------------- pagination
  'hardwareMarket.pagination.previous': 'Previous page',
  'hardwareMarket.pagination.next': 'Next page',
  'hardwareMarket.pagination.page': 'Page {{page}} of {{total}}',
  'hardwareMarket.pagination.showing': 'Showing {{from}}-{{to}} of {{total}}',

  // ----------------------------------------------------------------- detail
  'hardwareMarket.detail.back': 'Back to the market',
  'hardwareMarket.detail.breadcrumb': 'Breadcrumb',
  'hardwareMarket.detail.notFound': 'This product is no longer available in the market.',
  'hardwareMarket.detail.skuTitle': 'Choose a configuration',
  'hardwareMarket.detail.skuDescription': 'Every configuration is a sellable SKU of this product.',
  'hardwareMarket.detail.skuEmpty': 'No configuration is on sale right now.',
  'hardwareMarket.detail.skuUnavailable': 'Unavailable',
  'hardwareMarket.detail.skuNo': 'SKU',
  'hardwareMarket.detail.skuConfiguration': 'Configuration',
  'hardwareMarket.detail.price': 'Price',
  'hardwareMarket.detail.availability': 'Availability',
  'hardwareMarket.detail.about': 'About this product',
  'hardwareMarket.detail.specs': 'Specifications',
  'hardwareMarket.detail.info': 'Product information',
  'hardwareMarket.detail.productNo': 'Product no.',
  'hardwareMarket.detail.category': 'Category',
  'hardwareMarket.detail.type': 'Fulfillment type',
  'hardwareMarket.detail.status': 'Status',
  'hardwareMarket.detail.publishedAt': 'Published',
  'hardwareMarket.detail.updatedAt': 'Updated',
  'hardwareMarket.detail.buy': 'Buy now',
  'hardwareMarket.detail.selectSku': 'Select a configuration to continue',
  'hardwareMarket.detail.quantity': 'Quantity',
  'hardwareMarket.detail.decreaseQuantity': 'Decrease quantity',
  'hardwareMarket.detail.increaseQuantity': 'Increase quantity',
  'hardwareMarket.detail.stockTracked': 'Stock tracked',
  'hardwareMarket.detail.stockUntracked': 'Always available',
  'hardwareMarket.detail.statusValue.active': 'Published',
  'hardwareMarket.detail.statusValue.draft': 'Draft',
  'hardwareMarket.detail.statusValue.inactive': 'Inactive',
  'hardwareMarket.detail.statusValue.archived': 'Archived',

  // ------------------------------------------------------------------- type
  'hardwareMarket.type.physical': 'Physical device',
  'hardwareMarket.type.digital': 'Digital',
  'hardwareMarket.type.service': 'Service',
  'hardwareMarket.type.membership': 'Membership',
  'hardwareMarket.type.points': 'Points',

  // --------------------------------------------------------------- purchase
  'hardwareMarket.purchase.title': 'Checkout',
  'hardwareMarket.purchase.description': 'Confirm the shipping address, review the server quote, then place the order.',
  'hardwareMarket.purchase.item': 'Item',
  'hardwareMarket.purchase.quantity': 'Quantity',
  'hardwareMarket.purchase.addressTitle': 'Shipping address',
  'hardwareMarket.purchase.receiverName': 'Recipient name',
  'hardwareMarket.purchase.receiverPhone': 'Recipient phone',
  'hardwareMarket.purchase.countryCode': 'Country or region',
  'hardwareMarket.purchase.province': 'Province or state',
  'hardwareMarket.purchase.city': 'City',
  'hardwareMarket.purchase.district': 'District',
  'hardwareMarket.purchase.detailAddress': 'Street address',
  'hardwareMarket.purchase.postalCode': 'Postal code',
  'hardwareMarket.purchase.required': 'Required',
  'hardwareMarket.purchase.optional': 'Optional',
  'hardwareMarket.purchase.requiredMissing': 'Complete the required address fields to continue.',
  'hardwareMarket.purchase.quote': 'Calculate total',
  'hardwareMarket.purchase.quoting': 'Calculating...',
  'hardwareMarket.purchase.submit': 'Place order',
  'hardwareMarket.purchase.submitting': 'Placing the order...',
  'hardwareMarket.purchase.originalAmount': 'Original amount',
  'hardwareMarket.purchase.discountAmount': 'Discount',
  'hardwareMarket.purchase.payableAmount': 'Payable',
  'hardwareMarket.purchase.close': 'Close checkout',
  'hardwareMarket.purchase.cancel': 'Cancel',
  'hardwareMarket.purchase.editAddress': 'Edit address',
  'hardwareMarket.purchase.error': 'The checkout step did not complete. Please try again.',
  'hardwareMarket.purchase.sessionRequired': 'Sign in to buy',
  'hardwareMarket.purchase.sessionRequiredHint': 'A signed-in Cloud Router account is required to place an order.',
  'hardwareMarket.purchase.sessionSignIn': 'Sign in',
  'hardwareMarket.purchase.quoteReady': 'Quote ready',
  'hardwareMarket.purchase.paymentHint': 'The order is handed to the platform cashier after it is placed.',

  // ----------------------------------------------------------------- common
  'hardwareMarket.common.dash': '—',
};
