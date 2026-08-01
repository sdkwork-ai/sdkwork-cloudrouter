import { upstreamAccountEnUsMessages } from './en-US/ai/upstream/account';
import { upstreamAccountGroupEnUsMessages } from './en-US/ai/upstream/accountGroup';
import { upstreamSharedEnUsMessages } from './en-US/ai/upstream/shared';
import { upstreamSupplierEnUsMessages } from './en-US/ai/upstream/supplier';
import { upstreamAccountZhCnMessages } from './zh-CN/ai/upstream/account';
import { upstreamAccountGroupZhCnMessages } from './zh-CN/ai/upstream/accountGroup';
import { upstreamSharedZhCnMessages } from './zh-CN/ai/upstream/shared';
import { upstreamSupplierZhCnMessages } from './zh-CN/ai/upstream/supplier';

export const upstreamAccountMessages = {
  en: upstreamAccountEnUsMessages,
  zh: upstreamAccountZhCnMessages,
};

export const upstreamAccountGroupMessages = {
  en: upstreamAccountGroupEnUsMessages,
  zh: upstreamAccountGroupZhCnMessages,
};

export const upstreamSharedMessages = {
  en: upstreamSharedEnUsMessages,
  zh: upstreamSharedZhCnMessages,
};

export const upstreamSupplierMessages = {
  en: upstreamSupplierEnUsMessages,
  zh: upstreamSupplierZhCnMessages,
};
