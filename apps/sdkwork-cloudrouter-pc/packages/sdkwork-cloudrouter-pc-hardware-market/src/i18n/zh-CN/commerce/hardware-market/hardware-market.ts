/**
 * Smart Hardware Market catalog - Simplified Chinese (zh-CN).
 *
 * Mirror of `en-US/commerce/hardware-market/hardware-market.ts`: same key set,
 * same interpolation placeholders.
 */

export const hardwareMarketMessagesZh: Record<string, string> = {
  // ------------------------------------------------------------------- meta
  'hardwareMarket.meta.title': '智能硬件市场',

  // ------------------------------------------------------------------- hero
  'hardwareMarket.badge': '由商品中心驱动',
  'hardwareMarket.hero.title': '智能硬件市场',
  'hardwareMarket.hero.subtitle':
    '这里汇集商品中心发布的智能硬件：整机、传感设备、边缘网关与配件。实时浏览商品目录、比较规格，并使用平台支付完成下单。',
  'hardwareMarket.hero.browse': '浏览商品目录',
  'hardwareMarket.hero.manage': '在商品中心管理',
  'hardwareMarket.hero.stat.products': '在售商品',
  'hardwareMarket.hero.stat.categories': '商品分类',

  // ----------------------------------------------------------------- search
  'hardwareMarket.search.label': '搜索智能硬件',
  'hardwareMarket.search.placeholder': '按商品名称、商品编号或型号搜索',
  'hardwareMarket.search.submit': '搜索',
  'hardwareMarket.search.clear': '清除搜索',

  // ------------------------------------------------------------------- sort
  'hardwareMarket.sort.label': '排序方式',
  'hardwareMarket.sort.newest': '最新上架',
  'hardwareMarket.sort.priceAsc': '价格从低到高',
  'hardwareMarket.sort.priceDesc': '价格从高到低',

  // --------------------------------------------------------------- category
  'hardwareMarket.category.label': '商品分类',
  'hardwareMarket.category.all': '全部硬件',
  'hardwareMarket.results': '共 {{count}} 件商品',

  // ------------------------------------------------------------------- card
  'hardwareMarket.card.from': '起售价',
  'hardwareMarket.card.priceUnavailable': '价格请咨询',
  'hardwareMarket.card.skuCount': '{{count}} 个规格',
  'hardwareMarket.card.view': '查看商品',
  'hardwareMarket.card.taglineFallback': '由 Cloud Router 商品中心发布',
  'hardwareMarket.card.originalPrice': '标价',
  'hardwareMarket.card.discount': '立减 {{percent}}%',

  // ------------------------------------------------------------------ state
  'hardwareMarket.state.loading': '正在加载硬件商品目录...',
  'hardwareMarket.state.error': '硬件商品目录加载失败',
  'hardwareMarket.state.errorHint': '请检查网络后重试，当前无法连接商品中心服务。',
  'hardwareMarket.state.retry': '重新加载',
  'hardwareMarket.state.empty': '商品中心尚未发布智能硬件',
  'hardwareMarket.state.emptyHint': '运营人员在商品中心发布硬件商品后，会立即显示在这里。',
  'hardwareMarket.state.noResults': '没有符合当前筛选条件的硬件',
  'hardwareMarket.state.noResultsHint': '请尝试其他关键词或分类，也可以清除筛选条件。',

  // ------------------------------------------------------------- pagination
  'hardwareMarket.pagination.previous': '上一页',
  'hardwareMarket.pagination.next': '下一页',
  'hardwareMarket.pagination.page': '第 {{page}} / {{total}} 页',
  'hardwareMarket.pagination.showing': '显示第 {{from}}-{{to}} 件，共 {{total}} 件',

  // ----------------------------------------------------------------- detail
  'hardwareMarket.detail.back': '返回硬件市场',
  'hardwareMarket.detail.breadcrumb': '面包屑导航',
  'hardwareMarket.detail.notFound': '该商品已从市场下架，暂时无法购买。',
  'hardwareMarket.detail.skuTitle': '选择配置',
  'hardwareMarket.detail.skuDescription': '每个配置都是该商品可售的 SKU。',
  'hardwareMarket.detail.skuEmpty': '当前没有可售的配置。',
  'hardwareMarket.detail.skuUnavailable': '暂不可售',
  'hardwareMarket.detail.skuNo': 'SKU 编号',
  'hardwareMarket.detail.skuConfiguration': '配置',
  'hardwareMarket.detail.price': '价格',
  'hardwareMarket.detail.availability': '库存方式',
  'hardwareMarket.detail.about': '商品介绍',
  'hardwareMarket.detail.specs': '规格参数',
  'hardwareMarket.detail.info': '商品信息',
  'hardwareMarket.detail.productNo': '商品编号',
  'hardwareMarket.detail.category': '所属分类',
  'hardwareMarket.detail.type': '履约类型',
  'hardwareMarket.detail.status': '状态',
  'hardwareMarket.detail.publishedAt': '上架时间',
  'hardwareMarket.detail.updatedAt': '更新时间',
  'hardwareMarket.detail.buy': '立即购买',
  'hardwareMarket.detail.selectSku': '请先选择配置',
  'hardwareMarket.detail.quantity': '购买数量',
  'hardwareMarket.detail.decreaseQuantity': '减少数量',
  'hardwareMarket.detail.increaseQuantity': '增加数量',
  'hardwareMarket.detail.stockTracked': '库存管理',
  'hardwareMarket.detail.stockUntracked': '不限库存',
  'hardwareMarket.detail.statusValue.active': '已上架',
  'hardwareMarket.detail.statusValue.draft': '草稿',
  'hardwareMarket.detail.statusValue.inactive': '已停用',
  'hardwareMarket.detail.statusValue.archived': '已归档',

  // ------------------------------------------------------------------- type
  'hardwareMarket.type.physical': '实体设备',
  'hardwareMarket.type.digital': '数字商品',
  'hardwareMarket.type.service': '服务',
  'hardwareMarket.type.membership': '会员',
  'hardwareMarket.type.points': '积分',

  // --------------------------------------------------------------- purchase
  'hardwareMarket.purchase.title': '确认下单',
  'hardwareMarket.purchase.description': '填写收货地址并核对服务端报价后即可提交订单。',
  'hardwareMarket.purchase.item': '商品',
  'hardwareMarket.purchase.quantity': '数量',
  'hardwareMarket.purchase.addressTitle': '收货地址',
  'hardwareMarket.purchase.receiverName': '收货人',
  'hardwareMarket.purchase.receiverPhone': '联系电话',
  'hardwareMarket.purchase.countryCode': '国家或地区',
  'hardwareMarket.purchase.province': '省份',
  'hardwareMarket.purchase.city': '城市',
  'hardwareMarket.purchase.district': '区县',
  'hardwareMarket.purchase.detailAddress': '详细地址',
  'hardwareMarket.purchase.postalCode': '邮政编码',
  'hardwareMarket.purchase.required': '必填',
  'hardwareMarket.purchase.optional': '选填',
  'hardwareMarket.purchase.requiredMissing': '请填写完整的收货地址后继续。',
  'hardwareMarket.purchase.quote': '计算应付金额',
  'hardwareMarket.purchase.quoting': '正在计算...',
  'hardwareMarket.purchase.submit': '提交订单',
  'hardwareMarket.purchase.submitting': '正在提交订单...',
  'hardwareMarket.purchase.originalAmount': '商品原价',
  'hardwareMarket.purchase.discountAmount': '优惠金额',
  'hardwareMarket.purchase.payableAmount': '应付金额',
  'hardwareMarket.purchase.close': '关闭下单窗口',
  'hardwareMarket.purchase.cancel': '取消',
  'hardwareMarket.purchase.editAddress': '修改地址',
  'hardwareMarket.purchase.error': '下单流程未完成，请重试。',
  'hardwareMarket.purchase.sessionRequired': '登录后购买',
  'hardwareMarket.purchase.sessionRequiredHint': '提交订单需要登录 Cloud Router 账号。',
  'hardwareMarket.purchase.sessionSignIn': '去登录',
  'hardwareMarket.purchase.quoteReady': '报价已生成',
  'hardwareMarket.purchase.paymentHint': '订单提交后会跳转到平台收银台完成支付。',

  // ----------------------------------------------------------------- common
  'hardwareMarket.common.dash': '—',
};
