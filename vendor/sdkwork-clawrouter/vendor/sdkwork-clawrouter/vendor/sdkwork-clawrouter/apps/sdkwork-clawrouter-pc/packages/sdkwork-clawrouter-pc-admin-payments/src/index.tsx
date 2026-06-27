import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BarChart3, CreditCard, Pencil, Power, PowerOff, Receipt, ShieldCheck, Trash2 } from 'lucide-react';
import { AdminResourceCenter, ConfirmDialog, type AdminResourceRecord, type AdminResourceSection } from '@sdkwork/clawroutes-pc-commons';
import {
  backendPaymentsAttemptsList,
  backendPaymentsChannelsList,
  backendPaymentsIntentsList,
  backendPaymentsMethodsList,
  backendPaymentsProviderAccountsCreate,
  backendPaymentsProviderAccountsDelete,
  backendPaymentsProviderAccountsList,
  backendPaymentsProviderAccountsStatusUpdate,
  backendPaymentsProviderAccountsUpdate,
  backendPaymentsProvidersList,
  backendPaymentsReconciliationRunsList,
  backendPaymentsRouteRulesList,
  backendPaymentsWebhookEventsList,
  type PaymentProviderAccountMutationInput,
} from './paymentsService';

type PaymentsAdminTab =
  | 'providers'
  | 'providerAccounts'
  | 'methods'
  | 'channels'
  | 'routeRules'
  | 'intents'
  | 'attempts'
  | 'webhookEvents'
  | 'reconciliationRuns';
type PaymentsAdminGroup = string;
type ProviderAccountFormMode = 'create' | 'edit';
type PaymentProviderCredentialMode = 'api_key' | 'rsa' | 'aes';
type PaymentProviderCredentialField =
  | 'paymentApiKey'
  | 'paymentClientId'
  | 'paymentClientSecret'
  | 'rsaPrivateKey'
  | 'rsaPublicKey'
  | 'aesKey'
  | 'webhookSigningKey'
  | 'certificateSerialNo';

type PaymentProviderAccountFormState = {
  providerCode: string;
  accountRole: string;
  merchantId: string;
  environment: string;
  countryCode: string;
  settlementCurrency: string;
  credentialMode: PaymentProviderCredentialMode;
  paymentApiKey: string;
  paymentClientId: string;
  paymentClientSecret: string;
  rsaPrivateKey: string;
  rsaPublicKey: string;
  aesKey: string;
  webhookSigningKey: string;
  certificateSerialNo: string;
  storedSecretRef: string;
  storedCertificateRef: string;
  storedWebhookSecretRef: string;
  storedCredentialMode: PaymentProviderCredentialMode;
  storedProviderCode: string;
  rotatedAt: string;
  note: string;
  status: string;
};

type PaymentProviderAccountSelectOption = {
  label: string;
  value: string;
};

type PaymentProviderOption = PaymentProviderAccountSelectOption & {
  capabilities: readonly string[];
  providerType: string;
  settlementType: string;
  status: string;
  supportedCountries: readonly string[];
  supportedCurrencies: readonly string[];
};

type PaymentProviderCode = 'wechat_pay' | 'alipay' | 'paypal' | 'stripe' | 'apple_pay' | 'google_pay';
type PaymentProviderEnvironment = 'sandbox' | 'production';
type PaymentProviderAccountStatus = 'active' | 'inactive' | 'disabled';
type PaymentProviderAccountRole = 'merchant' | 'service_provider';
type PaymentProviderCredentialProfile = {
  credentialMode: PaymentProviderCredentialMode;
  descriptionFallback: string;
  descriptionKey: string;
  fields: readonly PaymentProviderCredentialField[];
  fieldFallbacks?: Partial<Record<PaymentProviderCredentialField, string>>;
  fieldLabelKeys?: Partial<Record<PaymentProviderCredentialField, string>>;
  fieldPlaceholderFallbacks?: Partial<Record<PaymentProviderCredentialField, string>>;
  fieldPlaceholderKeys?: Partial<Record<PaymentProviderCredentialField, string>>;
  requiredFields: readonly PaymentProviderCredentialField[];
  secretPurpose: string;
  titleFallback: string;
  titleKey: string;
  webhookPurpose?: string;
};
type PaymentProviderTranslation = (
  key: string,
  fallback: string,
  options?: Record<string, number | string>,
) => string;
type PaymentProviderCredentialFileUploadProps = {
  allowFileUpload?: boolean;
  fileReadErrorMessage?: string;
  onFileReadError?: (message: string | null) => void;
  uploadLabel?: string;
};

const DEFAULT_PAGE_PARAMS = { page: 1, pageSize: 100 };
const DEFAULT_PAYMENTS_SECTION_ID: PaymentsAdminTab = 'providerAccounts';
const DEFAULT_COUNTRY_CODE = 'US';
const DEFAULT_CURRENCY_CODE = 'USD';
const DEFAULT_PAYMENT_PROVIDER_ACCOUNT_FORM: PaymentProviderAccountFormState = {
  providerCode: '',
  accountRole: 'merchant',
  merchantId: '',
  environment: 'sandbox',
  countryCode: DEFAULT_COUNTRY_CODE,
  settlementCurrency: DEFAULT_CURRENCY_CODE,
  credentialMode: 'api_key',
  paymentApiKey: '',
  paymentClientId: '',
  paymentClientSecret: '',
  rsaPrivateKey: '',
  rsaPublicKey: '',
  aesKey: '',
  webhookSigningKey: '',
  certificateSerialNo: '',
  storedSecretRef: '',
  storedCertificateRef: '',
  storedWebhookSecretRef: '',
  storedCredentialMode: 'api_key',
  storedProviderCode: '',
  rotatedAt: '',
  note: '',
  status: 'active',
};

const PAYMENT_PROVIDER_CODES: readonly PaymentProviderCode[] = [
  'wechat_pay',
  'alipay',
  'paypal',
  'stripe',
  'apple_pay',
  'google_pay',
];
const PAYMENT_PROVIDER_ENVIRONMENTS: readonly PaymentProviderEnvironment[] = ['sandbox', 'production'];
const PAYMENT_PROVIDER_ACCOUNT_STATUSES: readonly PaymentProviderAccountStatus[] = ['active', 'inactive', 'disabled'];
const PAYMENT_PROVIDER_ACCOUNT_ROLES: readonly PaymentProviderAccountRole[] = ['merchant', 'service_provider'];
const PAYMENT_PROVIDER_CREDENTIAL_MODES: readonly PaymentProviderCredentialMode[] = ['api_key', 'rsa', 'aes'];
const PAYMENT_PROVIDER_CREDENTIAL_FILE_ACCEPT = '.pem,.key,.crt,.cer,.cert,.txt,.json,.p8,.pub';
const DEFAULT_COUNTRY_OPTIONS: readonly string[] = ['US', 'CN', 'HK', 'SG', 'JP', 'GB', 'EU'];
const DEFAULT_CURRENCY_OPTIONS: readonly string[] = ['USD', 'CNY', 'HKD', 'SGD', 'JPY', 'GBP', 'EUR'];
const PAYMENT_PROVIDER_GENERIC_CREDENTIAL_PROFILES: Record<PaymentProviderCredentialMode, PaymentProviderCredentialProfile> = {
  api_key: {
    credentialMode: 'api_key',
    descriptionFallback: 'Use the provider API key and optional webhook signing key.',
    descriptionKey: 'admin.commerce.payments.providerAccounts.credentials.profile.apiKey.desc',
    fields: ['paymentApiKey', 'webhookSigningKey'],
    requiredFields: ['paymentApiKey'],
    secretPurpose: 'api-key',
    titleFallback: 'API key',
    titleKey: 'admin.commerce.payments.providerAccounts.credentials.profile.apiKey',
    webhookPurpose: 'webhook-signing-key',
  },
  rsa: {
    credentialMode: 'rsa',
    descriptionFallback: 'Use RSA signing keys, certificate serial number, and optional webhook signing key.',
    descriptionKey: 'admin.commerce.payments.providerAccounts.credentials.profile.rsa.desc',
    fields: ['rsaPrivateKey', 'rsaPublicKey', 'certificateSerialNo', 'webhookSigningKey'],
    requiredFields: ['rsaPrivateKey', 'rsaPublicKey'],
    secretPurpose: 'rsa-keypair',
    titleFallback: 'RSA certificate',
    titleKey: 'admin.commerce.payments.providerAccounts.credentials.profile.rsa',
    webhookPurpose: 'webhook-signing-key',
  },
  aes: {
    credentialMode: 'aes',
    descriptionFallback: 'Use an AES key and optional webhook signing key.',
    descriptionKey: 'admin.commerce.payments.providerAccounts.credentials.profile.aes.desc',
    fields: ['aesKey', 'webhookSigningKey'],
    requiredFields: ['aesKey'],
    secretPurpose: 'aes-key',
    titleFallback: 'AES key',
    titleKey: 'admin.commerce.payments.providerAccounts.credentials.profile.aes',
    webhookPurpose: 'webhook-signing-key',
  },
};
const PAYMENT_PROVIDER_CREDENTIAL_PROFILES: Record<PaymentProviderCode, PaymentProviderCredentialProfile> = {
  wechat_pay: {
    credentialMode: 'rsa',
    descriptionFallback: 'WeChat Pay v3 needs the merchant private key, merchant certificate serial number, platform public key, and API v3 AES key.',
    descriptionKey: 'admin.commerce.payments.providerAccounts.credentials.profile.wechatPay.desc',
    fields: ['rsaPrivateKey', 'rsaPublicKey', 'certificateSerialNo', 'aesKey', 'webhookSigningKey'],
    fieldFallbacks: {
      aesKey: 'WeChat Pay API v3 key',
      certificateSerialNo: 'Merchant certificate serial no',
      rsaPrivateKey: 'Merchant private key',
      rsaPublicKey: 'Platform public key',
      webhookSigningKey: 'Notification signing key',
    },
    fieldLabelKeys: {
      aesKey: 'admin.commerce.payments.providerAccounts.credentials.wechatPayApiV3Key',
      certificateSerialNo: 'admin.commerce.payments.providerAccounts.credentials.wechatPayCertificateSerialNo',
      rsaPrivateKey: 'admin.commerce.payments.providerAccounts.credentials.wechatPayMerchantPrivateKey',
      rsaPublicKey: 'admin.commerce.payments.providerAccounts.credentials.wechatPayPlatformPublicKey',
    },
    fieldPlaceholderKeys: {
      aesKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.wechatPayApiV3Key',
      certificateSerialNo: 'admin.commerce.payments.providerAccounts.credentials.placeholder.certificateSerialNo',
      rsaPrivateKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.privateKey',
      rsaPublicKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.publicKey',
    },
    requiredFields: ['rsaPrivateKey', 'rsaPublicKey', 'certificateSerialNo', 'aesKey'],
    secretPurpose: 'wechat-pay-rsa-api-v3',
    titleFallback: 'WeChat Pay v3',
    titleKey: 'admin.commerce.payments.providerAccounts.credentials.profile.wechatPay',
    webhookPurpose: 'wechat-pay-api-v3-webhook',
  },
  alipay: {
    credentialMode: 'rsa',
    descriptionFallback: 'Alipay uses App ID, application private key, Alipay public key, and optional certificate serial number.',
    descriptionKey: 'admin.commerce.payments.providerAccounts.credentials.profile.alipay.desc',
    fields: ['paymentClientId', 'rsaPrivateKey', 'rsaPublicKey', 'certificateSerialNo', 'webhookSigningKey'],
    fieldFallbacks: {
      certificateSerialNo: 'App certificate serial no',
      paymentClientId: 'Alipay App ID',
      rsaPrivateKey: 'Application private key',
      rsaPublicKey: 'Alipay public key',
    },
    fieldLabelKeys: {
      certificateSerialNo: 'admin.commerce.payments.providerAccounts.credentials.alipayCertificateSerialNo',
      paymentClientId: 'admin.commerce.payments.providerAccounts.credentials.alipayAppId',
      rsaPrivateKey: 'admin.commerce.payments.providerAccounts.credentials.alipayAppPrivateKey',
      rsaPublicKey: 'admin.commerce.payments.providerAccounts.credentials.alipayPublicKey',
    },
    fieldPlaceholderKeys: {
      paymentClientId: 'admin.commerce.payments.providerAccounts.credentials.placeholder.alipayAppId',
      rsaPrivateKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.privateKey',
      rsaPublicKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.publicKey',
    },
    requiredFields: ['paymentClientId', 'rsaPrivateKey', 'rsaPublicKey'],
    secretPurpose: 'alipay-rsa-app',
    titleFallback: 'Alipay RSA',
    titleKey: 'admin.commerce.payments.providerAccounts.credentials.profile.alipay',
    webhookPurpose: 'alipay-notify-signing-key',
  },
  paypal: {
    credentialMode: 'api_key',
    descriptionFallback: 'PayPal checkout uses REST Client ID, Client Secret, and optional webhook ID or signing secret.',
    descriptionKey: 'admin.commerce.payments.providerAccounts.credentials.profile.paypal.desc',
    fields: ['paymentClientId', 'paymentClientSecret', 'webhookSigningKey'],
    fieldFallbacks: {
      paymentClientId: 'PayPal Client ID',
      paymentClientSecret: 'PayPal Client Secret',
      webhookSigningKey: 'Webhook ID or signing secret',
    },
    fieldLabelKeys: {
      paymentClientId: 'admin.commerce.payments.providerAccounts.credentials.paypalClientId',
      paymentClientSecret: 'admin.commerce.payments.providerAccounts.credentials.paypalClientSecret',
    },
    fieldPlaceholderKeys: {
      paymentClientId: 'admin.commerce.payments.providerAccounts.credentials.placeholder.paypalClientId',
      paymentClientSecret: 'admin.commerce.payments.providerAccounts.credentials.placeholder.paypalClientSecret',
    },
    requiredFields: ['paymentClientId', 'paymentClientSecret'],
    secretPurpose: 'paypal-client-secret',
    titleFallback: 'PayPal REST app',
    titleKey: 'admin.commerce.payments.providerAccounts.credentials.profile.paypal',
    webhookPurpose: 'paypal-webhook-secret',
  },
  stripe: {
    credentialMode: 'api_key',
    descriptionFallback: 'Stripe uses the secret key and webhook signing secret from Developers > API keys and Webhooks.',
    descriptionKey: 'admin.commerce.payments.providerAccounts.credentials.profile.stripe.desc',
    fields: ['paymentApiKey', 'webhookSigningKey'],
    fieldFallbacks: {
      paymentApiKey: 'Stripe secret key',
      webhookSigningKey: 'Webhook signing secret',
    },
    fieldLabelKeys: {
      paymentApiKey: 'admin.commerce.payments.providerAccounts.credentials.stripeSecretKey',
      webhookSigningKey: 'admin.commerce.payments.providerAccounts.credentials.stripeWebhookSigningSecret',
    },
    fieldPlaceholderKeys: {
      paymentApiKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.stripeSecretKey',
      webhookSigningKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.stripeWebhookSigningSecret',
    },
    requiredFields: ['paymentApiKey'],
    secretPurpose: 'stripe-secret-key',
    titleFallback: 'Stripe secret key',
    titleKey: 'admin.commerce.payments.providerAccounts.credentials.profile.stripe',
    webhookPurpose: 'stripe-webhook-signing-secret',
  },
  apple_pay: {
    credentialMode: 'rsa',
    descriptionFallback: 'Apple Pay uses the merchant identifier, payment processing certificate, and private key.',
    descriptionKey: 'admin.commerce.payments.providerAccounts.credentials.profile.applePay.desc',
    fields: ['paymentClientId', 'rsaPrivateKey', 'rsaPublicKey', 'certificateSerialNo'],
    fieldFallbacks: {
      certificateSerialNo: 'Payment processing certificate serial no',
      paymentClientId: 'Apple Pay Merchant ID',
      rsaPrivateKey: 'Merchant identity private key',
      rsaPublicKey: 'Payment processing certificate',
    },
    fieldLabelKeys: {
      paymentClientId: 'admin.commerce.payments.providerAccounts.credentials.appleMerchantId',
      rsaPrivateKey: 'admin.commerce.payments.providerAccounts.credentials.appleMerchantPrivateKey',
      rsaPublicKey: 'admin.commerce.payments.providerAccounts.credentials.applePaymentProcessingCertificate',
    },
    fieldPlaceholderKeys: {
      paymentClientId: 'admin.commerce.payments.providerAccounts.credentials.placeholder.appleMerchantId',
      rsaPrivateKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.privateKey',
      rsaPublicKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.certificatePem',
    },
    requiredFields: ['paymentClientId', 'rsaPrivateKey', 'rsaPublicKey'],
    secretPurpose: 'apple-pay-merchant-certificate',
    titleFallback: 'Apple Pay certificate',
    titleKey: 'admin.commerce.payments.providerAccounts.credentials.profile.applePay',
  },
  google_pay: {
    credentialMode: 'api_key',
    descriptionFallback: 'Google Pay uses the gateway merchant ID and gateway credentials from the processor configuration.',
    descriptionKey: 'admin.commerce.payments.providerAccounts.credentials.profile.googlePay.desc',
    fields: ['paymentClientId', 'paymentApiKey'],
    fieldFallbacks: {
      paymentApiKey: 'Gateway credential',
      paymentClientId: 'Gateway merchant ID',
    },
    fieldLabelKeys: {
      paymentApiKey: 'admin.commerce.payments.providerAccounts.credentials.googleGatewayCredential',
      paymentClientId: 'admin.commerce.payments.providerAccounts.credentials.googleGatewayMerchantId',
    },
    fieldPlaceholderKeys: {
      paymentApiKey: 'admin.commerce.payments.providerAccounts.credentials.placeholder.googleGatewayCredential',
      paymentClientId: 'admin.commerce.payments.providerAccounts.credentials.placeholder.googleGatewayMerchantId',
    },
    requiredFields: ['paymentClientId'],
    secretPurpose: 'google-pay-gateway-credential',
    titleFallback: 'Google Pay gateway',
    titleKey: 'admin.commerce.payments.providerAccounts.credentials.profile.googlePay',
  },
};
type PaymentsAdminProps = {
  sectionId?: string;
};

function resolvePaymentsSectionId(sectionId?: string): PaymentsAdminTab {
  if (
    sectionId === 'providers'
    || sectionId === 'providerAccounts'
    || sectionId === 'methods'
    || sectionId === 'channels'
    || sectionId === 'routeRules'
    || sectionId === 'intents'
    || sectionId === 'attempts'
    || sectionId === 'webhookEvents'
    || sectionId === 'reconciliationRuns'
  ) {
    return sectionId;
  }
  return DEFAULT_PAYMENTS_SECTION_ID;
}

export function PaymentsAdmin({ sectionId }: PaymentsAdminProps = {}) {
  const { t } = useTranslation();
  const activeSectionId = resolvePaymentsSectionId(sectionId);
  const [providerAccountFormOpen, setProviderAccountFormOpen] = useState(false);
  const [providerAccountFormMode, setProviderAccountFormMode] = useState<ProviderAccountFormMode>('create');
  const [editingProviderAccountId, setEditingProviderAccountId] = useState<string | null>(null);
  const [providerAccountForm, setProviderAccountForm] = useState<PaymentProviderAccountFormState>(
    DEFAULT_PAYMENT_PROVIDER_ACCOUNT_FORM,
  );
  const [providerAccountSaving, setProviderAccountSaving] = useState(false);
  const [providerAccountError, setProviderAccountError] = useState<string | null>(null);
  const [providerAccountSuccess, setProviderAccountSuccess] = useState<string | null>(null);
  const [providerAccountDeleteConfirmation, setProviderAccountDeleteConfirmation] = useState<AdminResourceRecord | null>(null);
  const [providerAccountRefreshKey, setProviderAccountRefreshKey] = useState(0);
  const [paymentProviderCodeOptions, setPaymentProviderCodeOptions] = useState<
    readonly PaymentProviderOption[]
  >([]);

  const selectedPaymentProviderCode = providerAccountForm.providerCode;
  const selectedPaymentProviderOption = useMemo(
    () => paymentProviderCodeOptions.find((option) => option.value === selectedPaymentProviderCode) ?? null,
    [paymentProviderCodeOptions, selectedPaymentProviderCode],
  );
  const selectedPaymentProviderCredentialProfile = useMemo(
    () => resolvePaymentProviderCredentialProfile(selectedPaymentProviderCode, providerAccountForm.credentialMode),
    [providerAccountForm.credentialMode, selectedPaymentProviderCode],
  );
  const selectedPaymentProviderCountryOptions = useMemo(
    () => valuesToSelectOptions(
      selectedPaymentProviderOption?.supportedCountries.length
        ? selectedPaymentProviderOption.supportedCountries
        : DEFAULT_COUNTRY_OPTIONS,
    ),
    [selectedPaymentProviderOption],
  );
  const selectedPaymentProviderCurrencyOptions = useMemo(
    () => valuesToSelectOptions(
      selectedPaymentProviderOption?.supportedCurrencies.length
        ? selectedPaymentProviderOption.supportedCurrencies
        : DEFAULT_CURRENCY_OPTIONS,
    ),
    [selectedPaymentProviderOption],
  );
  const paymentProviderEnvironmentOptions = useMemo<readonly PaymentProviderAccountSelectOption[]>(
    () => PAYMENT_PROVIDER_ENVIRONMENTS.map((environment) => ({
      value: environment,
      label: environment === 'production'
        ? t('admin.commerce.payments.providerAccounts.environment.production', 'Production')
        : t('admin.commerce.payments.providerAccounts.environment.sandbox', 'Sandbox'),
    })),
    [t],
  );
  const paymentProviderAccountStatusOptions = useMemo<readonly PaymentProviderAccountSelectOption[]>(
    () => PAYMENT_PROVIDER_ACCOUNT_STATUSES.map((status) => ({
      value: status,
      label: status === 'active'
        ? t('admin.commerce.payments.providerAccounts.status.active', 'Available')
        : status === 'disabled'
          ? t('admin.commerce.payments.providerAccounts.status.disabled', 'Disabled')
          : t('admin.commerce.payments.providerAccounts.status.inactive', 'Standby'),
    })),
    [t],
  );
  const paymentProviderAccountRoleOptions = useMemo<readonly PaymentProviderAccountSelectOption[]>(
    () => PAYMENT_PROVIDER_ACCOUNT_ROLES.map((role) => ({
      value: role,
      label: role === 'service_provider'
        ? t('admin.commerce.payments.providerAccounts.accountRole.serviceProvider', 'Service provider')
        : t('admin.commerce.payments.providerAccounts.accountRole.merchant', 'Merchant'),
    })),
    [t],
  );
  const paymentProviderCredentialModeOptions = useMemo<readonly PaymentProviderAccountSelectOption[]>(
    () => PAYMENT_PROVIDER_CREDENTIAL_MODES.map((mode) => ({
      value: mode,
      label: mode === 'rsa'
        ? t('admin.commerce.payments.providerAccounts.credentials.credentialMode.rsa', 'RSA')
        : mode === 'aes'
          ? t('admin.commerce.payments.providerAccounts.credentials.credentialMode.aes', 'AES')
          : t('admin.commerce.payments.providerAccounts.credentials.credentialMode.apiKey', 'API key'),
    })),
    [t],
  );

  const loadPaymentProviderOptions = useCallback(async () => {
    try {
      const response = await backendPaymentsProvidersList();
      const options = readPaymentProviderCodeOptions(response);
      setPaymentProviderCodeOptions(options);
      setProviderAccountForm((current) => {
        if (providerAccountFormMode !== 'create') {
          return current;
        }
        if (options.some((option) => option.value === current.providerCode)) {
          return current;
        }
        const firstOption = firstPaymentProviderOption(options);
        return applyPaymentProviderDefaults({
          ...current,
          credentialMode: recommendedProviderCredentialMode(firstOption),
          providerCode: firstOption?.value ?? current.providerCode,
          storedCredentialMode: recommendedProviderCredentialMode(firstOption),
          storedProviderCode: firstOption?.value ?? current.providerCode,
        }, firstOption, {
          accountRole: true,
          countryCode: true,
          settlementCurrency: true,
        });
      });
    } catch (error) {
      setProviderAccountError(error instanceof Error && error.message
        ? error.message
        : t('admin.commerce.payments.providerAccounts.providerOptionsError', 'Payment providers could not be loaded.'));
    }
  }, [providerAccountFormMode, t]);

  useEffect(() => {
    void loadPaymentProviderOptions();
  }, [loadPaymentProviderOptions]);

  const selectPaymentProvider = useCallback((providerCode: string) => {
    const provider = paymentProviderCodeOptions.find((option) => option.value === providerCode) ?? null;
    setProviderAccountForm((current) => {
      const nextForm = applyPaymentProviderDefaults(
        {
          ...current,
          credentialMode: providerAccountFormMode === 'create'
            ? recommendedProviderCredentialMode(provider)
            : current.credentialMode,
          providerCode,
          storedCredentialMode: providerAccountFormMode === 'create'
            ? recommendedProviderCredentialMode(provider)
            : current.storedCredentialMode,
          storedProviderCode: providerAccountFormMode === 'create' ? providerCode : current.storedProviderCode,
        },
        provider,
        {
          accountRole: true,
          countryCode: true,
          settlementCurrency: true,
        },
      );
      return nextForm;
    });
  }, [paymentProviderCodeOptions, providerAccountFormMode]);

  const openProviderAccountForm = useCallback(() => {
    const firstOption = firstPaymentProviderOption(paymentProviderCodeOptions);
    setProviderAccountFormMode('create');
    setEditingProviderAccountId(null);
    setProviderAccountForm(createDefaultPaymentProviderAccountForm(firstOption));
    setProviderAccountError(null);
    setProviderAccountSuccess(null);
    if (paymentProviderCodeOptions.length === 0) {
      void loadPaymentProviderOptions();
    }
    setProviderAccountFormOpen(true);
  }, [loadPaymentProviderOptions, paymentProviderCodeOptions]);

  const openProviderAccountEditForm = useCallback((record: AdminResourceRecord) => {
    const providerAccountId = readProviderAccountRecordId(record);
    if (!providerAccountId) {
      setProviderAccountError(t('admin.commerce.payments.providerAccounts.missingAccountId', 'Provider account id is missing.'));
      return;
    }
    const providerCode = readRecordText(record, 'providerCode');
    const provider = paymentProviderCodeOptions.find((option) => option.value === providerCode) ?? null;
    const credentialMode = readPaymentProviderCredentialMode(record);
    setProviderAccountFormMode('edit');
    setEditingProviderAccountId(providerAccountId);
    setProviderAccountForm(applyPaymentProviderDefaults(
        {
        providerCode,
        accountRole: readRecordText(record, 'accountRole') || recommendedProviderAccountRole(provider),
        merchantId: readRecordText(record, 'merchantId'),
        environment: readRecordText(record, 'environment') || 'sandbox',
        countryCode: readRecordText(record, 'countryCode') || defaultProviderCountry(provider),
        settlementCurrency: readRecordText(record, 'settlementCurrency') || defaultProviderCurrency(provider),
        credentialMode,
        paymentApiKey: '',
        paymentClientId: '',
        paymentClientSecret: '',
        rsaPrivateKey: '',
        rsaPublicKey: '',
        aesKey: '',
        webhookSigningKey: '',
        certificateSerialNo: readCertificateSerialNo(record),
        storedSecretRef: readRecordText(record, 'secretRef'),
        storedCertificateRef: readRecordText(record, 'certificateRef'),
        storedWebhookSecretRef: readRecordText(record, 'webhookSecretRef'),
        storedCredentialMode: credentialMode,
        storedProviderCode: providerCode,
        rotatedAt: readRecordText(record, 'rotatedAt'),
        note: readRecordText(record, 'note'),
        status: readRecordText(record, 'status') || 'active',
      },
      provider,
      {
        accountRole: false,
        countryCode: false,
        settlementCurrency: false,
      },
    ));
    setProviderAccountError(null);
    setProviderAccountSuccess(null);
    if (paymentProviderCodeOptions.length === 0) {
      void loadPaymentProviderOptions();
    }
    setProviderAccountFormOpen(true);
  }, [loadPaymentProviderOptions, paymentProviderCodeOptions, t]);

  const updateProviderAccountStatus = useCallback(async (
    record: AdminResourceRecord,
    status: PaymentProviderAccountStatus,
  ) => {
    const providerAccountId = readProviderAccountRecordId(record);
    if (!providerAccountId) {
      setProviderAccountError(t('admin.commerce.payments.providerAccounts.missingAccountId', 'Provider account id is missing.'));
      return;
    }
    setProviderAccountSaving(true);
    setProviderAccountError(null);
    setProviderAccountSuccess(null);
    try {
      await backendPaymentsProviderAccountsStatusUpdate(providerAccountId, {
        status,
        note: status === 'active'
          ? t('admin.commerce.payments.providerAccounts.status.setAvailableNote', 'Set as the available account from admin payment center')
          : status === 'inactive'
            ? t('admin.commerce.payments.providerAccounts.status.enableNote', 'Enabled as a standby account from admin payment center')
            : t('admin.commerce.payments.providerAccounts.status.disableNote', 'Disabled from admin payment center'),
      });
      setProviderAccountSuccess(status === 'active'
        ? t('admin.commerce.payments.providerAccounts.status.setAvailableSuccess', 'Provider account is now the available account for this channel scope. Other active accounts in the same scope were moved to standby.')
        : status === 'inactive'
          ? t('admin.commerce.payments.providerAccounts.status.enableSuccess', 'Provider account enabled as a standby account.')
          : t('admin.commerce.payments.providerAccounts.status.disableSuccess', 'Provider account disabled.'));
      setProviderAccountRefreshKey((current) => current + 1);
    } catch (error) {
      setProviderAccountError(error instanceof Error && error.message ? error.message : t('admin.commerce.payments.providerAccounts.saveError', 'Provider account could not be saved.'));
    } finally {
      setProviderAccountSaving(false);
    }
  }, [t]);

  const deleteProviderAccount = useCallback((record: AdminResourceRecord) => {
    const providerAccountId = readProviderAccountRecordId(record);
    if (!providerAccountId) {
      setProviderAccountError(t('admin.commerce.payments.providerAccounts.missingAccountId', 'Provider account id is missing.'));
      return;
    }
    setProviderAccountError(null);
    setProviderAccountSuccess(null);
    setProviderAccountDeleteConfirmation(record);
  }, [t]);

  const executeConfirmedProviderAccountDelete = useCallback(async () => {
    const record = providerAccountDeleteConfirmation;
    const providerAccountId = record ? readProviderAccountRecordId(record) : '';
    if (!record || !providerAccountId) {
      setProviderAccountError(t('admin.commerce.payments.providerAccounts.missingAccountId', 'Provider account id is missing.'));
      setProviderAccountDeleteConfirmation(null);
      return;
    }
    setProviderAccountSaving(true);
    setProviderAccountError(null);
    setProviderAccountSuccess(null);
    try {
      await backendPaymentsProviderAccountsDelete(providerAccountId);
      setProviderAccountSuccess(t('admin.commerce.payments.providerAccounts.deleteSuccess', 'Provider account deleted.'));
      setProviderAccountRefreshKey((current) => current + 1);
      setProviderAccountDeleteConfirmation(null);
    } catch (error) {
      setProviderAccountError(error instanceof Error && error.message ? error.message : t('admin.commerce.payments.providerAccounts.deleteError', 'Provider account could not be deleted.'));
    } finally {
      setProviderAccountSaving(false);
    }
  }, [providerAccountDeleteConfirmation, t]);

  const paymentSections = useMemo<AdminResourceSection<PaymentsAdminTab, PaymentsAdminGroup>[]>(() => [
    {
      id: 'providers',
      title: t('admin.commerce.payments.providers.title', 'Payment Providers'),
      description: t('admin.commerce.payments.providers.desc', 'Domestic and international provider definitions such as WeChat Pay, Alipay, PayPal, Stripe, Apple Pay, and Google Pay.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: () => backendPaymentsProvidersList(),
      columns: [
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'displayName', label: t('admin.col.name', 'Name') },
        { key: 'providerType', label: t('admin.col.type', 'Type') },
        { key: 'supportedCountries', label: t('admin.col.countries', 'Countries') },
        { key: 'supportedCurrencies', label: t('admin.col.currencies', 'Currencies') },
        { key: 'capabilities', label: t('admin.col.capabilities', 'Capabilities') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['providerCode', 'displayName', 'providerType', 'supportedCountries', 'supportedCurrencies', 'capabilities', 'status'],
    },
    {
      id: 'providerAccounts',
      title: t('admin.commerce.payments.providerAccounts.title', 'Provider Accounts'),
      description: t('admin.commerce.payments.providerAccounts.desc', 'Configure multiple provider accounts per channel scope. Only one account can be available in a channel scope; setting a new one available moves peers to standby.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: () => backendPaymentsProviderAccountsList(DEFAULT_PAGE_PARAMS),
      action: { label: t('admin.commerce.payments.providerAccounts.addAction', 'Add provider account'), icon: <CreditCard className="h-4 w-4" />, onClick: openProviderAccountForm },
      columns: [
        { key: 'accountNo', label: t('admin.col.accountNo', 'Account No') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        {
          key: 'channelScope',
          label: t('admin.commerce.payments.providerAccounts.channelScope', 'Channel scope'),
          format: (_value, record) => paymentProviderAccountChannelScopeLabel(record),
        },
        {
          key: 'accountRole',
          label: t('admin.commerce.payments.providerAccounts.accountRole', 'Account role'),
          format: (value) => formatPaymentProviderAccountRole(value, t),
        },
        { key: 'merchantId', label: t('admin.col.merchant', 'Merchant') },
        { key: 'environment', label: t('admin.col.env', 'Env') },
        { key: 'countryCode', label: t('admin.col.country', 'Country') },
        { key: 'settlementCurrency', label: t('admin.col.currency', 'Currency') },
        {
          key: 'availability',
          label: t('admin.commerce.payments.providerAccounts.availability', 'Availability'),
          format: (_value, record) => formatPaymentProviderAccountAvailability(record, t),
        },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'rotatedAt', label: t('admin.col.rotated', 'Rotated') },
        { key: 'note', label: t('admin.col.note', 'Note') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      rowActions: [
        {
          label: t('admin.commerce.payments.providerAccounts.actions.edit', 'Edit'),
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: (record) => openProviderAccountEditForm(record),
        },
        {
          label: t('admin.commerce.payments.providerAccounts.actions.enable', 'Enable'),
          icon: <Power className="h-3.5 w-3.5" />,
          isVisible: (record) => readRecordText(record, 'status') === 'disabled',
          onClick: (record) => void updateProviderAccountStatus(record, 'inactive'),
        },
        {
          label: t('admin.commerce.payments.providerAccounts.actions.setAvailable', 'Set available'),
          icon: <Power className="h-3.5 w-3.5" />,
          isVisible: (record) => readRecordText(record, 'status') === 'inactive',
          onClick: (record) => void updateProviderAccountStatus(record, 'active'),
        },
        {
          label: t('admin.commerce.payments.providerAccounts.actions.disable', 'Disable'),
          icon: <PowerOff className="h-3.5 w-3.5" />,
          isVisible: (record) => ['active', 'inactive'].includes(readRecordText(record, 'status')),
          onClick: (record) => void updateProviderAccountStatus(record, 'disabled'),
        },
        {
          label: t('admin.commerce.payments.providerAccounts.actions.delete', 'Delete'),
          icon: <Trash2 className="h-3.5 w-3.5" />,
          tone: 'danger',
          onClick: (record) => void deleteProviderAccount(record),
        },
      ],
      searchFields: ['accountNo', 'providerCode', 'accountRole', 'merchantId', 'environment', 'countryCode', 'settlementCurrency', 'status', 'rotatedAt', 'note'],
    },
    {
      id: 'methods',
      title: t('admin.commerce.payments.methods.title', 'Payment Methods'),
      description: t('admin.commerce.payments.methods.desc', 'Payment methods exposed to checkout, membership purchase, recharge, and wallet flows.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: () => backendPaymentsMethodsList(),
      columns: [
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'displayName', label: t('admin.col.name', 'Name') },
        { key: 'methodType', label: t('admin.col.type', 'Type') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'checkoutScenes', label: t('admin.col.scenes', 'Scenes') },
        { key: 'sortOrder', label: t('admin.col.sort', 'Sort'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['methodCode', 'displayName', 'methodType', 'providerCode', 'checkoutScenes', 'status'],
    },
    {
      id: 'channels',
      title: t('admin.commerce.payments.channels.title', 'Payment Channels'),
      description: t('admin.commerce.payments.channels.desc', 'Country, currency, scene, and provider-account routing channels.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: () => backendPaymentsChannelsList(),
      columns: [
        { key: 'channelNo', label: t('admin.col.channel', 'Channel') },
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'providerAccountId', label: t('admin.col.account', 'Account') },
        { key: 'sceneCode', label: t('admin.col.scene', 'Scene') },
        { key: 'countryCode', label: t('admin.col.country', 'Country') },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'priority', label: t('admin.col.priority', 'Priority'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['channelNo', 'methodCode', 'providerAccountId', 'countryCode', 'currencyCode', 'sceneCode', 'status', 'updatedAt'],
    },
    {
      id: 'routeRules',
      title: t('admin.commerce.payments.routeRules.title', 'Route Rules'),
      description: t('admin.commerce.payments.routeRules.desc', 'Payment route rules by market, method, currency, priority, and fallback.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: () => backendPaymentsRouteRulesList(),
      columns: [
        { key: 'ruleNo', label: t('admin.col.rule', 'Rule') },
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'sceneCode', label: t('admin.col.scene', 'Scene') },
        { key: 'countryCode', label: t('admin.col.country', 'Country') },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'channelId', label: t('admin.col.channel', 'Channel') },
        { key: 'fallbackEnabled', label: t('admin.col.fallback', 'Fallback') },
        { key: 'priority', label: t('admin.col.priority', 'Priority'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['ruleNo', 'methodCode', 'currencyCode', 'countryCode', 'sceneCode', 'status', 'updatedAt'],
    },
    {
      id: 'intents',
      title: t('admin.commerce.payments.intents.title', 'Payment Intents'),
      description: t('admin.commerce.payments.intents.desc', 'Unified payment intents created from orders, memberships, recharges, and wallet flows.'),
      icon: <Receipt className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.paymentRuntime', 'Payment Runtime'),
      load: () => backendPaymentsIntentsList(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'intentNo', label: t('admin.col.intent', 'Intent') },
        { key: 'orderId', label: t('admin.col.order', 'Order') },
        { key: 'subjectType', label: t('admin.col.type', 'Type') },
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'amount', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['intentNo', 'orderId', 'subjectType', 'methodCode', 'providerCode', 'currencyCode', 'status'],
    },
    {
      id: 'attempts',
      title: t('admin.commerce.payments.attempts.title', 'Payment Attempts'),
      description: t('admin.commerce.payments.attempts.desc', 'Provider request attempts, external trade numbers, and payment result lifecycle.'),
      icon: <Receipt className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.paymentRuntime', 'Payment Runtime'),
      load: () => backendPaymentsAttemptsList(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'attemptNo', label: t('admin.col.attempt', 'Attempt') },
        { key: 'intentId', label: t('admin.col.intent', 'Intent') },
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'externalTradeNo', label: t('admin.col.externalTrade', 'External Trade') },
        { key: 'amount', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'paidAt', label: t('admin.col.paid', 'Paid') },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['attemptNo', 'intentId', 'providerCode', 'methodCode', 'externalTradeNo', 'currencyCode', 'status'],
    },
    {
      id: 'webhookEvents',
      title: t('admin.commerce.payments.webhookEvents.title', 'Webhook Events'),
      description: t('admin.commerce.payments.webhookEvents.desc', 'Inbound payment webhook events and idempotent processing state.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.riskReconciliation', 'Risk & Reconciliation'),
      load: () => backendPaymentsWebhookEventsList(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'eventNo', label: t('admin.col.event', 'Event') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'eventType', label: t('admin.col.type', 'Type') },
        { key: 'externalEventId', label: t('admin.col.externalEvent', 'External Event') },
        { key: 'processStatus', label: t('admin.col.process', 'Process') },
        { key: 'receivedAt', label: t('admin.col.received', 'Received') },
        { key: 'processedAt', label: t('admin.col.processed', 'Processed') },
      ],
      searchFields: ['eventNo', 'providerCode', 'eventType', 'processStatus', 'externalEventId'],
    },
    {
      id: 'reconciliationRuns',
      title: t('admin.commerce.payments.reconciliationRuns.title', 'Reconciliation Runs'),
      description: t('admin.commerce.payments.reconciliationRuns.desc', 'Payment reconciliation batches, statement imports, and discrepancy tracking.'),
      icon: <BarChart3 className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.riskReconciliation', 'Risk & Reconciliation'),
      load: () => backendPaymentsReconciliationRunsList(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'runNo', label: t('admin.col.run', 'Run') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'businessDate', label: t('admin.col.businessDate', 'Business Date') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
        { key: 'finishedAt', label: t('admin.col.finished', 'Finished') },
      ],
      searchFields: ['runNo', 'providerCode', 'businessDate', 'status', 'createdAt'],
    },
  ], [deleteProviderAccount, openProviderAccountEditForm, openProviderAccountForm, t, updateProviderAccountStatus]);

  const providerAccountDeleteConfirmationAccountNo = providerAccountDeleteConfirmation
    ? readRecordText(providerAccountDeleteConfirmation, 'accountNo') || readProviderAccountRecordId(providerAccountDeleteConfirmation)
    : '';

  const submitPaymentProviderAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProviderAccountSaving(true);
    setProviderAccountError(null);
    setProviderAccountSuccess(null);
    try {
      const payload = toPaymentProviderAccountRequest(providerAccountForm);
      const response = providerAccountFormMode === 'edit' && editingProviderAccountId
        ? await backendPaymentsProviderAccountsUpdate(editingProviderAccountId, payload)
        : await backendPaymentsProviderAccountsCreate(payload);
      setProviderAccountSuccess(t('admin.commerce.payments.providerAccounts.saveSuccess', 'Provider account request accepted: {{requestNo}}', { requestNo: readCommerceOperationRequestNo(response) }));
      setProviderAccountRefreshKey((current) => current + 1);
      setProviderAccountForm(createDefaultPaymentProviderAccountForm(firstPaymentProviderOption(paymentProviderCodeOptions)));
      setProviderAccountFormMode('create');
      setEditingProviderAccountId(null);
      setProviderAccountFormOpen(false);
    } catch (error) {
      setProviderAccountError(error instanceof Error && error.message ? error.message : t('admin.commerce.payments.providerAccounts.saveError', 'Provider account could not be saved.'));
    } finally {
      setProviderAccountSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden" data-admin-payments-layout>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AdminResourceCenter
        activeSectionId={activeSectionId}
        emptyTitle={t('admin.commerce.payments.empty', 'No payment records')}
        errorTitle={t('admin.commerce.payments.error', 'Payment data could not be loaded')}
        initialSectionId={DEFAULT_PAYMENTS_SECTION_ID}
        key={activeSectionId}
        loadingTitle={t('admin.commerce.payments.loading', 'Loading payment records...')}
        recordActionColumnLabel={t('common.actions.actions', 'Actions')}
        refreshKey={providerAccountRefreshKey}
        sections={paymentSections}
        showSectionNavigation={false}
        tableViewportDataAttribute="admin-payments-table-viewport"
      />
      </div>
      {!providerAccountFormOpen && (providerAccountError || providerAccountSuccess) && (
        <div className="shrink-0" data-admin-payment-provider-account-feedback>
          <div className={`rounded-lg border px-3 py-2 text-sm ${
            providerAccountError
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
          }`}>
            {providerAccountError ?? providerAccountSuccess}
          </div>
        </div>
      )}
      {providerAccountFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 backdrop-blur-sm">
          <form
            className="flex h-[calc(100vh-16px)] max-h-[980px] w-full max-w-[min(1720px,calc(100vw-16px))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]"
            data-admin-payment-provider-account-shell
            onSubmit={submitPaymentProviderAccount}
          >
            <div className="border-b border-slate-200 px-5 py-3 dark:border-white/10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {providerAccountFormMode === 'edit'
                  ? t('admin.commerce.payments.providerAccounts.formTitleEdit', 'Edit provider account')
                  : t('admin.commerce.payments.providerAccounts.formTitle', 'Add provider account')}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('admin.commerce.payments.providerAccounts.formDesc', 'Configure merchant and service-provider credentials for WeChat Pay, Alipay, PayPal, Stripe, Apple Pay, Google Pay, and other providers.')}
              </p>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto xl:grid-cols-[232px_minmax(0,1fr)]">
              <aside
                className="border-b border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03] xl:border-b-0 xl:border-r"
                data-admin-payment-provider-list
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('admin.commerce.payments.providerAccounts.providerList', 'Payment provider')}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {paymentProviderCodeOptions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-2.5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                      {t('admin.commerce.payments.providerAccounts.providerOptionsEmpty', 'No configured providers')}
                    </div>
                  ) : paymentProviderCodeOptions.map((provider) => {
                    const selected = provider.value === selectedPaymentProviderCode;
                    return (
                      <button
                        className={`flex min-h-14 w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                          selected
                            ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-sm dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'
                        }`}
                        key={provider.value}
                        onClick={() => selectPaymentProvider(provider.value)}
                        type="button"
                      >
                        <PaymentProviderLogo label={provider.label} providerCode={provider.value} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{provider.label}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{provider.value}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>
              <div className="min-w-0 p-4" data-admin-payment-provider-account-form>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-admin-payment-provider-compact-form>
                  <PaymentProviderAccountSelect label={t('admin.commerce.payments.providerAccounts.accountRole', 'Account role')} value={providerAccountForm.accountRole} onChange={(accountRole) => setProviderAccountForm((current) => ({ ...current, accountRole }))} options={paymentProviderAccountRoleOptions} required />
                  <PaymentProviderAccountInput label={paymentProviderAccountMerchantIdLabel(selectedPaymentProviderCode, providerAccountForm.accountRole, t)} value={providerAccountForm.merchantId} onChange={(merchantId) => setProviderAccountForm((current) => ({ ...current, merchantId }))} required />
                  <PaymentProviderAccountSelect label={t('admin.commerce.payments.providerAccounts.environment', 'Environment')} value={providerAccountForm.environment} onChange={(environment) => setProviderAccountForm((current) => ({ ...current, environment }))} options={paymentProviderEnvironmentOptions} required />
                  <PaymentProviderAccountSelect label={t('admin.commerce.payments.providerAccounts.countryCode', 'Country code')} value={providerAccountForm.countryCode} onChange={(countryCode) => setProviderAccountForm((current) => ({ ...current, countryCode }))} options={selectedPaymentProviderCountryOptions} required />
                  <PaymentProviderAccountSelect label={t('admin.commerce.payments.providerAccounts.settlementCurrency', 'Settlement currency')} value={providerAccountForm.settlementCurrency} onChange={(settlementCurrency) => setProviderAccountForm((current) => ({ ...current, settlementCurrency }))} options={selectedPaymentProviderCurrencyOptions} required />
                  <PaymentProviderAccountInput label={t('admin.commerce.payments.providerAccounts.rotatedAt', 'Rotated at')} value={providerAccountForm.rotatedAt} onChange={(rotatedAt) => setProviderAccountForm((current) => ({ ...current, rotatedAt }))} />
                  <PaymentProviderAccountSelect label={t('admin.commerce.payments.providerAccounts.status', 'Status')} value={providerAccountForm.status} onChange={(status) => setProviderAccountForm((current) => ({ ...current, status }))} options={paymentProviderAccountStatusOptions} required />
                  <div className="md:col-span-2 xl:col-span-4">
                    <PaymentProviderCredentialModeSwitch
                      label={t('admin.commerce.payments.providerAccounts.credentials.credentialMode', 'Credential type')}
                      onChange={(credentialMode) => setProviderAccountForm((current) => ({ ...current, credentialMode }))}
                      options={paymentProviderCredentialModeOptions}
                      value={providerAccountForm.credentialMode}
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                      {showPaymentProviderCredentialField(selectedPaymentProviderCredentialProfile, 'paymentClientId') ? (
                        <PaymentProviderAccountInput label={paymentProviderCredentialFieldLabel(selectedPaymentProviderCredentialProfile, 'paymentClientId', t)} placeholder={paymentProviderCredentialFieldPlaceholder(selectedPaymentProviderCredentialProfile, 'paymentClientId', t)} value={providerAccountForm.paymentClientId} onChange={(paymentClientId) => setProviderAccountForm((current) => ({ ...current, paymentClientId }))} required={shouldRequireCredentialInput(providerAccountForm, selectedPaymentProviderCredentialProfile, 'paymentClientId', providerAccountFormMode)} />
                      ) : null}
                      {showPaymentProviderCredentialField(selectedPaymentProviderCredentialProfile, 'paymentClientSecret') ? (
                        <PaymentProviderAccountInput allowFileUpload fileReadErrorMessage={t('admin.commerce.payments.providerAccounts.credentials.fileReadError', 'Credential file could not be read. Please choose a text PEM, key, certificate, or secret file.')} label={paymentProviderCredentialFieldLabel(selectedPaymentProviderCredentialProfile, 'paymentClientSecret', t)} onFileReadError={setProviderAccountError} placeholder={paymentProviderCredentialFieldPlaceholder(selectedPaymentProviderCredentialProfile, 'paymentClientSecret', t)} uploadLabel={t('admin.commerce.payments.providerAccounts.credentials.uploadFile', 'Upload file')} value={providerAccountForm.paymentClientSecret} onChange={(paymentClientSecret) => setProviderAccountForm((current) => ({ ...current, paymentClientSecret }))} required={shouldRequireCredentialInput(providerAccountForm, selectedPaymentProviderCredentialProfile, 'paymentClientSecret', providerAccountFormMode)} />
                      ) : null}
                      {showPaymentProviderCredentialField(selectedPaymentProviderCredentialProfile, 'paymentApiKey') ? (
                        <PaymentProviderAccountInput allowFileUpload fileReadErrorMessage={t('admin.commerce.payments.providerAccounts.credentials.fileReadError', 'Credential file could not be read. Please choose a text PEM, key, certificate, or secret file.')} label={paymentProviderCredentialFieldLabel(selectedPaymentProviderCredentialProfile, 'paymentApiKey', t)} onFileReadError={setProviderAccountError} placeholder={paymentProviderCredentialFieldPlaceholder(selectedPaymentProviderCredentialProfile, 'paymentApiKey', t)} uploadLabel={t('admin.commerce.payments.providerAccounts.credentials.uploadFile', 'Upload file')} value={providerAccountForm.paymentApiKey} onChange={(paymentApiKey) => setProviderAccountForm((current) => ({ ...current, paymentApiKey }))} required={shouldRequireCredentialInput(providerAccountForm, selectedPaymentProviderCredentialProfile, 'paymentApiKey', providerAccountFormMode)} />
                      ) : null}
                      {showPaymentProviderCredentialField(selectedPaymentProviderCredentialProfile, 'certificateSerialNo') ? (
                        <PaymentProviderAccountInput label={paymentProviderCredentialFieldLabel(selectedPaymentProviderCredentialProfile, 'certificateSerialNo', t)} placeholder={paymentProviderCredentialFieldPlaceholder(selectedPaymentProviderCredentialProfile, 'certificateSerialNo', t)} value={providerAccountForm.certificateSerialNo} onChange={(certificateSerialNo) => setProviderAccountForm((current) => ({ ...current, certificateSerialNo }))} required={shouldRequireCredentialInput(providerAccountForm, selectedPaymentProviderCredentialProfile, 'certificateSerialNo', providerAccountFormMode)} />
                      ) : null}
                      {showPaymentProviderCredentialField(selectedPaymentProviderCredentialProfile, 'aesKey') ? (
                        <PaymentProviderAccountInput allowFileUpload fileReadErrorMessage={t('admin.commerce.payments.providerAccounts.credentials.fileReadError', 'Credential file could not be read. Please choose a text PEM, key, certificate, or secret file.')} label={paymentProviderCredentialFieldLabel(selectedPaymentProviderCredentialProfile, 'aesKey', t)} onFileReadError={setProviderAccountError} placeholder={paymentProviderCredentialFieldPlaceholder(selectedPaymentProviderCredentialProfile, 'aesKey', t)} uploadLabel={t('admin.commerce.payments.providerAccounts.credentials.uploadFile', 'Upload file')} value={providerAccountForm.aesKey} onChange={(aesKey) => setProviderAccountForm((current) => ({ ...current, aesKey }))} required={shouldRequireCredentialInput(providerAccountForm, selectedPaymentProviderCredentialProfile, 'aesKey', providerAccountFormMode)} />
                      ) : null}
                      {showPaymentProviderCredentialField(selectedPaymentProviderCredentialProfile, 'webhookSigningKey') ? (
                        <PaymentProviderAccountInput allowFileUpload fileReadErrorMessage={t('admin.commerce.payments.providerAccounts.credentials.fileReadError', 'Credential file could not be read. Please choose a text PEM, key, certificate, or secret file.')} label={paymentProviderCredentialFieldLabel(selectedPaymentProviderCredentialProfile, 'webhookSigningKey', t)} onFileReadError={setProviderAccountError} placeholder={paymentProviderCredentialFieldPlaceholder(selectedPaymentProviderCredentialProfile, 'webhookSigningKey', t)} uploadLabel={t('admin.commerce.payments.providerAccounts.credentials.uploadFile', 'Upload file')} value={providerAccountForm.webhookSigningKey} onChange={(webhookSigningKey) => setProviderAccountForm((current) => ({ ...current, webhookSigningKey }))} required={shouldRequireCredentialInput(providerAccountForm, selectedPaymentProviderCredentialProfile, 'webhookSigningKey', providerAccountFormMode)} />
                      ) : null}
                      {showPaymentProviderCredentialField(selectedPaymentProviderCredentialProfile, 'rsaPrivateKey') ? (
                        <div className="md:col-span-2 xl:col-span-3">
                          <PaymentProviderAccountTextArea allowFileUpload compact fileReadErrorMessage={t('admin.commerce.payments.providerAccounts.credentials.fileReadError', 'Credential file could not be read. Please choose a text PEM, key, certificate, or secret file.')} label={paymentProviderCredentialFieldLabel(selectedPaymentProviderCredentialProfile, 'rsaPrivateKey', t)} onFileReadError={setProviderAccountError} placeholder={paymentProviderCredentialFieldPlaceholder(selectedPaymentProviderCredentialProfile, 'rsaPrivateKey', t)} uploadLabel={t('admin.commerce.payments.providerAccounts.credentials.uploadFile', 'Upload file')} value={providerAccountForm.rsaPrivateKey} onChange={(rsaPrivateKey) => setProviderAccountForm((current) => ({ ...current, rsaPrivateKey }))} required={shouldRequireCredentialInput(providerAccountForm, selectedPaymentProviderCredentialProfile, 'rsaPrivateKey', providerAccountFormMode)} />
                        </div>
                      ) : null}
                      {showPaymentProviderCredentialField(selectedPaymentProviderCredentialProfile, 'rsaPublicKey') ? (
                        <div className="md:col-span-2 xl:col-span-3">
                          <PaymentProviderAccountTextArea allowFileUpload compact fileReadErrorMessage={t('admin.commerce.payments.providerAccounts.credentials.fileReadError', 'Credential file could not be read. Please choose a text PEM, key, certificate, or secret file.')} label={paymentProviderCredentialFieldLabel(selectedPaymentProviderCredentialProfile, 'rsaPublicKey', t)} onFileReadError={setProviderAccountError} placeholder={paymentProviderCredentialFieldPlaceholder(selectedPaymentProviderCredentialProfile, 'rsaPublicKey', t)} uploadLabel={t('admin.commerce.payments.providerAccounts.credentials.uploadFile', 'Upload file')} value={providerAccountForm.rsaPublicKey} onChange={(rsaPublicKey) => setProviderAccountForm((current) => ({ ...current, rsaPublicKey }))} required={shouldRequireCredentialInput(providerAccountForm, selectedPaymentProviderCredentialProfile, 'rsaPublicKey', providerAccountFormMode)} />
                        </div>
                      ) : null}
                      <div className="md:col-span-2 xl:col-span-3">
                        <PaymentProviderAccountTextArea compact label={t('admin.commerce.payments.providerAccounts.note', 'Note')} value={providerAccountForm.note} onChange={(note) => setProviderAccountForm((current) => ({ ...current, note }))} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {(providerAccountError || providerAccountSuccess) && (
              <div className="px-5 pb-4" data-admin-payment-provider-account-feedback>
                <div className={`rounded-lg border px-3 py-2 text-sm ${
                  providerAccountError
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                }`}>
                  {providerAccountError ?? providerAccountSuccess}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-white/10">
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                disabled={providerAccountSaving}
                onClick={() => setProviderAccountFormOpen(false)}
                type="button"
              >
                {t('admin.action.cancel', 'Cancel')}
              </button>
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                disabled={providerAccountSaving || paymentProviderCodeOptions.length === 0}
                type="submit"
              >
                {providerAccountSaving
                  ? t('admin.action.saving', 'Saving...')
                  : providerAccountFormMode === 'edit'
                    ? t('admin.commerce.payments.providerAccounts.saveEdit', 'Save changes')
                    : t('admin.commerce.payments.providerAccounts.save', 'Save account')}
              </button>
            </div>
          </form>
        </div>
      )}
      {providerAccountDeleteConfirmation && (
        <ConfirmDialog
          title={t('admin.commerce.payments.providerAccounts.deleteTitle', 'Delete provider account?')}
          description={t(
            'admin.commerce.payments.providerAccounts.deleteConfirm',
            'Delete provider account {{accountNo}}? Channels using this account must be removed first.',
            { accountNo: providerAccountDeleteConfirmationAccountNo },
          )}
          confirmLabel={t('admin.commerce.payments.providerAccounts.actions.delete', 'Delete')}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={providerAccountSaving}
          onConfirm={() => void executeConfirmedProviderAccountDelete()}
          onCancel={() => setProviderAccountDeleteConfirmation(null)}
        />
      )}
    </div>
  );
}

function PaymentProviderLogo({
  label,
  providerCode,
  size = 'md',
}: {
  label: string;
  providerCode: string;
  size?: 'md' | 'sm';
}) {
  const logo = paymentProviderLogoStyle(providerCode, label);
  const sizeClass = size === 'sm'
    ? 'h-10 w-10 rounded-lg text-xs'
    : 'h-10 w-10 rounded-lg text-xs';
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-bold ${sizeClass} ${logo.className}`}
      data-admin-payment-provider-logo
    >
      {logo.mark}
    </span>
  );
}

function PaymentProviderAccountInput({
  allowFileUpload = false,
  fileReadErrorMessage,
  label,
  onChange,
  onFileReadError,
  placeholder,
  required = false,
  uploadLabel,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
} & PaymentProviderCredentialFileUploadProps) {
  const fieldId = useId();
  return (
    <div className="block text-sm">
      <label className="font-medium text-slate-700 dark:text-slate-300" htmlFor={fieldId}>
        {label}
      </label>
      <input
        autoComplete="off"
        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
        id={fieldId}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
      {allowFileUpload ? (
        <PaymentProviderCredentialFileUploadLink
          fileReadErrorMessage={fileReadErrorMessage}
          onContent={onChange}
          onFileReadError={onFileReadError}
          uploadLabel={uploadLabel}
        />
      ) : null}
    </div>
  );
}

function PaymentProviderCredentialFileUploadLink({
  fileReadErrorMessage = 'Credential file could not be read. Please choose a text PEM, key, certificate, or secret file.',
  onContent,
  onFileReadError,
  uploadLabel = 'Upload file',
}: {
  fileReadErrorMessage?: string;
  onContent: (value: string) => void;
  onFileReadError?: (message: string | null) => void;
  uploadLabel?: string;
}) {
  const fileInputId = useId();
  const readCredentialFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const content = await file.text();
      onContent(content);
      onFileReadError?.(null);
    } catch {
      onFileReadError?.(fileReadErrorMessage);
    } finally {
      input.value = '';
    }
  };
  return (
    <label
      className="mt-1 inline-flex cursor-pointer items-center text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
      data-admin-payment-provider-credential-file-upload
      htmlFor={fileInputId}
    >
      {uploadLabel}
      <input
        accept={PAYMENT_PROVIDER_CREDENTIAL_FILE_ACCEPT}
        className="sr-only"
        id={fileInputId}
        onChange={readCredentialFile}
        type="file"
      />
    </label>
  );
}

function PaymentProviderCredentialModeSwitch({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: PaymentProviderCredentialMode) => void;
  options: readonly PaymentProviderAccountSelectOption[];
  value: PaymentProviderCredentialMode;
}) {
  return (
    <div className="block text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="mt-1 grid grid-cols-3 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-black/20">
        {options.map((option) => {
          const mode = option.value as PaymentProviderCredentialMode;
          const selected = mode === value;
          return (
            <button
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-white/10 dark:text-blue-200'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
              key={option.value}
              onClick={() => onChange(mode)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentProviderAccountSelect({
  disabled = false,
  emptyLabel,
  label,
  onChange,
  options,
  required = false,
  value,
}: {
  disabled?: boolean;
  emptyLabel?: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly PaymentProviderAccountSelectOption[];
  required?: boolean;
  value: string;
}) {
  const hasCurrentValue = value && options.some((option) => option.value === value);
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <select
        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      >
        {options.length === 0 && emptyLabel ? (
          <option disabled value="">
            {emptyLabel}
          </option>
        ) : null}
        {value && !hasCurrentValue ? (
          <option value={value}>{value}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PaymentProviderAccountTextArea({
  allowFileUpload = false,
  compact = false,
  fileReadErrorMessage,
  label,
  onChange,
  onFileReadError,
  placeholder,
  required = false,
  uploadLabel,
  value,
}: {
  compact?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
} & PaymentProviderCredentialFileUploadProps) {
  const fieldId = useId();
  return (
    <div className="block text-sm">
      <label className="font-medium text-slate-700 dark:text-slate-300" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        autoComplete="off"
        className={`${compact ? 'mt-1 h-20' : 'mt-1 min-h-24'} w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white`}
        id={fieldId}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
      {allowFileUpload ? (
        <PaymentProviderCredentialFileUploadLink
          fileReadErrorMessage={fileReadErrorMessage}
          onContent={onChange}
          onFileReadError={onFileReadError}
          uploadLabel={uploadLabel}
        />
      ) : null}
    </div>
  );
}

function createDefaultPaymentProviderAccountForm(provider: PaymentProviderOption | null): PaymentProviderAccountFormState {
  const credentialMode = recommendedProviderCredentialMode(provider);
  const providerCode = provider?.value ?? '';
  return applyPaymentProviderDefaults(
    {
      ...DEFAULT_PAYMENT_PROVIDER_ACCOUNT_FORM,
      credentialMode,
      providerCode,
      storedCredentialMode: credentialMode,
      storedProviderCode: providerCode,
    },
    provider,
    {
      accountRole: true,
      countryCode: true,
      settlementCurrency: true,
    },
  );
}

function applyPaymentProviderDefaults(
  form: PaymentProviderAccountFormState,
  provider: PaymentProviderOption | null,
  fields: { accountRole: boolean; countryCode: boolean; settlementCurrency: boolean },
): PaymentProviderAccountFormState {
  const providerCode = provider?.value ?? form.providerCode;
  return {
    ...form,
    providerCode,
    accountRole: fields.accountRole ? recommendedProviderAccountRole(provider) : form.accountRole || recommendedProviderAccountRole(provider),
    countryCode: fields.countryCode ? defaultProviderCountry(provider) : form.countryCode || defaultProviderCountry(provider),
    settlementCurrency: fields.settlementCurrency ? defaultProviderCurrency(provider) : form.settlementCurrency || defaultProviderCurrency(provider),
  };
}

function normalizePaymentProviderSecretRefPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'provider';
}

function recommendedProviderCredentialMode(provider: PaymentProviderOption | null): PaymentProviderCredentialMode {
  if (!provider) {
    return 'api_key';
  }
  return resolvePaymentProviderCredentialProfile(provider.value).credentialMode;
}

function resolvePaymentProviderCredentialProfile(
  providerCode: string,
  credentialMode?: PaymentProviderCredentialMode,
): PaymentProviderCredentialProfile {
  const normalizedProviderCode = readPaymentProviderCode(providerCode);
  const providerProfile = normalizedProviderCode ? PAYMENT_PROVIDER_CREDENTIAL_PROFILES[normalizedProviderCode] : null;
  if (providerProfile && (!credentialMode || providerProfile.credentialMode === credentialMode)) {
    return providerProfile;
  }
  return PAYMENT_PROVIDER_GENERIC_CREDENTIAL_PROFILES[credentialMode ?? providerProfile?.credentialMode ?? 'api_key'];
}

function showPaymentProviderCredentialField(
  profile: PaymentProviderCredentialProfile,
  field: PaymentProviderCredentialField,
): boolean {
  return profile.fields.includes(field);
}

function paymentProviderCredentialFieldLabel(
  profile: PaymentProviderCredentialProfile,
  field: PaymentProviderCredentialField,
  t: (key: string, fallback: string) => string,
): string {
  const labelKey = profile.fieldLabelKeys?.[field] ?? genericPaymentProviderCredentialFieldLabelKey(field);
  const fallback = profile.fieldFallbacks?.[field] ?? genericPaymentProviderCredentialFieldFallback(field);
  return t(labelKey, fallback);
}

function paymentProviderCredentialFieldPlaceholder(
  profile: PaymentProviderCredentialProfile,
  field: PaymentProviderCredentialField,
  t: PaymentProviderTranslation,
): string {
  const placeholderKey = profile.fieldPlaceholderKeys?.[field] ?? genericPaymentProviderCredentialFieldPlaceholderKey(field);
  const fallback = profile.fieldPlaceholderFallbacks?.[field] ?? genericPaymentProviderCredentialFieldPlaceholderFallback(field);
  return t(placeholderKey, fallback);
}

function paymentProviderAccountMerchantIdLabel(
  providerCode: string,
  accountRole: string,
  t: PaymentProviderTranslation,
): string {
  switch (readPaymentProviderCode(providerCode)) {
    case 'wechat_pay':
      return accountRole === 'service_provider'
        ? t('admin.commerce.payments.providerAccounts.merchantId.wechatPayServiceProvider', 'WeChat Pay service provider ID')
        : t('admin.commerce.payments.providerAccounts.merchantId.wechatPayMerchant', 'WeChat Pay merchant ID');
    case 'alipay':
      return t('admin.commerce.payments.providerAccounts.merchantId.alipay', 'Alipay PID');
    case 'stripe':
      return t('admin.commerce.payments.providerAccounts.merchantId.stripe', 'Stripe account ID');
    case 'paypal':
      return t('admin.commerce.payments.providerAccounts.merchantId.paypal', 'PayPal merchant ID');
    case 'apple_pay':
      return t('admin.commerce.payments.providerAccounts.merchantId.applePay', 'Apple Pay merchant identifier');
    case 'google_pay':
      return t('admin.commerce.payments.providerAccounts.merchantId.googlePay', 'Google Pay gateway merchant ID');
    default:
      return t('admin.commerce.payments.providerAccounts.merchantId', 'Merchant ID');
  }
}

function shouldRequireCredentialInput(
  form: PaymentProviderAccountFormState,
  profile: PaymentProviderCredentialProfile,
  field: PaymentProviderCredentialField,
  formMode: ProviderAccountFormMode,
): boolean {
  if (!profile.requiredFields.includes(field)) {
    return false;
  }
  if (formMode === 'create') {
    return true;
  }
  return !canReuseStoredPaymentCredential(form, profile);
}

function canReuseStoredPaymentCredential(
  form: PaymentProviderAccountFormState,
  profile: PaymentProviderCredentialProfile,
): boolean {
  return form.storedProviderCode === form.providerCode
    && form.storedCredentialMode === profile.credentialMode
    && Boolean(form.storedSecretRef.trim());
}

function genericPaymentProviderCredentialFieldLabelKey(field: PaymentProviderCredentialField): string {
  switch (field) {
    case 'paymentClientId':
      return 'admin.commerce.payments.providerAccounts.credentials.paymentClientId';
    case 'paymentClientSecret':
      return 'admin.commerce.payments.providerAccounts.credentials.paymentClientSecret';
    case 'rsaPrivateKey':
      return 'admin.commerce.payments.providerAccounts.credentials.rsaPrivateKey';
    case 'rsaPublicKey':
      return 'admin.commerce.payments.providerAccounts.credentials.rsaPublicKey';
    case 'aesKey':
      return 'admin.commerce.payments.providerAccounts.credentials.aesKey';
    case 'webhookSigningKey':
      return 'admin.commerce.payments.providerAccounts.credentials.webhookSigningKey';
    case 'certificateSerialNo':
      return 'admin.commerce.payments.providerAccounts.credentials.certificateSerialNo';
    case 'paymentApiKey':
    default:
      return 'admin.commerce.payments.providerAccounts.credentials.paymentApiKey';
  }
}

function genericPaymentProviderCredentialFieldFallback(field: PaymentProviderCredentialField): string {
  switch (field) {
    case 'paymentClientId':
      return 'Client ID';
    case 'paymentClientSecret':
      return 'Client Secret';
    case 'rsaPrivateKey':
      return 'RSA private key';
    case 'rsaPublicKey':
      return 'RSA public key';
    case 'aesKey':
      return 'AES key';
    case 'webhookSigningKey':
      return 'Webhook signing key';
    case 'certificateSerialNo':
      return 'Certificate serial no';
    case 'paymentApiKey':
    default:
      return 'API key';
  }
}

function genericPaymentProviderCredentialFieldPlaceholderKey(field: PaymentProviderCredentialField): string {
  switch (field) {
    case 'paymentClientId':
      return 'admin.commerce.payments.providerAccounts.credentials.placeholder.clientId';
    case 'paymentClientSecret':
      return 'admin.commerce.payments.providerAccounts.credentials.placeholder.clientSecret';
    case 'rsaPrivateKey':
      return 'admin.commerce.payments.providerAccounts.credentials.placeholder.privateKey';
    case 'rsaPublicKey':
      return 'admin.commerce.payments.providerAccounts.credentials.placeholder.publicKey';
    case 'aesKey':
      return 'admin.commerce.payments.providerAccounts.credentials.placeholder.aesKey';
    case 'webhookSigningKey':
      return 'admin.commerce.payments.providerAccounts.credentials.placeholder.webhookSigningKey';
    case 'certificateSerialNo':
      return 'admin.commerce.payments.providerAccounts.credentials.placeholder.certificateSerialNo';
    case 'paymentApiKey':
    default:
      return 'admin.commerce.payments.providerAccounts.credentials.placeholder.apiKey';
  }
}

function genericPaymentProviderCredentialFieldPlaceholderFallback(field: PaymentProviderCredentialField): string {
  switch (field) {
    case 'paymentClientId':
      return 'Paste the client or application ID from the provider console';
    case 'paymentClientSecret':
      return 'Paste the client secret exactly as issued';
    case 'rsaPrivateKey':
      return 'Paste the full PEM private key, including BEGIN and END lines';
    case 'rsaPublicKey':
      return 'Paste the platform or provider public key';
    case 'aesKey':
      return 'Paste the AES key issued for this merchant account';
    case 'webhookSigningKey':
      return 'Paste the webhook signing secret from the provider console';
    case 'certificateSerialNo':
      return 'Paste the certificate serial number';
    case 'paymentApiKey':
    default:
      return 'Paste the payment API key from the provider console';
  }
}

function recommendedProviderAccountRole(provider: PaymentProviderOption | null): PaymentProviderAccountRole {
  if (!provider) {
    return 'merchant';
  }
  const providerType = provider.providerType.toLowerCase();
  const settlementType = provider.settlementType.toLowerCase();
  if (providerType.includes('platform') || settlementType === 'aggregator' || settlementType === 'platform') {
    return 'service_provider';
  }
  return 'merchant';
}

function defaultProviderCountry(provider: PaymentProviderOption | null): string {
  return provider?.supportedCountries[0] ?? DEFAULT_COUNTRY_CODE;
}

function defaultProviderCurrency(provider: PaymentProviderOption | null): string {
  return provider?.supportedCurrencies[0] ?? DEFAULT_CURRENCY_CODE;
}

function toPaymentProviderAccountRequest(form: PaymentProviderAccountFormState): PaymentProviderAccountMutationInput {
  const providerCode = requiredPaymentProviderCode(form.providerCode);
  const environment = requiredPaymentEnvironment(form.environment);
  const profile = resolvePaymentProviderCredentialProfile(providerCode, form.credentialMode);
  const merchantId = requiredText(form.merchantId, 'merchantId');
  const secretRef = resolvePaymentCredentialSecretRef(form, profile, providerCode, environment);
  const certificateRef = resolvePaymentCertificateRef(form, profile, providerCode, environment);
  const webhookSecretRef = resolvePaymentWebhookSecretRef(form, profile, providerCode, environment);
  return {
    providerCode,
    accountRole: requiredPaymentProviderAccountRole(form.accountRole),
    merchantId,
    environment,
    countryCode: requiredText(form.countryCode, 'countryCode').toUpperCase(),
    settlementCurrency: requiredText(form.settlementCurrency, 'settlementCurrency').toUpperCase(),
    secretRef,
    status: requiredPaymentStatus(form.status),
    ...(certificateRef ? { certificateRef } : {}),
    ...(webhookSecretRef ? { webhookSecretRef } : {}),
    ...(form.rotatedAt.trim() ? { rotatedAt: form.rotatedAt.trim() } : {}),
    ...(form.note.trim() ? { note: form.note.trim() } : {}),
  };
}

function resolvePaymentCredentialSecretRef(
  form: PaymentProviderAccountFormState,
  profile: PaymentProviderCredentialProfile,
  providerCode: PaymentProviderCode,
  environment: PaymentProviderEnvironment,
): string {
  const existingSecretRef = form.storedSecretRef.trim();
  if (hasRequiredPaymentCredentialFields(form, profile)) {
    return createPaymentSecretReference(form, providerCode, environment, profile.secretPurpose);
  }
  if (canReuseStoredPaymentCredential(form, profile) && existingSecretRef) {
    return existingSecretRef;
  }
  throw new Error(`${profile.requiredFields.join(', ')} are required`);
}

function resolvePaymentCertificateRef(
  form: PaymentProviderAccountFormState,
  profile: PaymentProviderCredentialProfile,
  providerCode: PaymentProviderCode,
  environment: PaymentProviderEnvironment,
): string | null {
  if (!showPaymentProviderCredentialField(profile, 'certificateSerialNo')) {
    return null;
  }
  const certificateSerialNo = form.certificateSerialNo.trim();
  if (certificateSerialNo) {
    return createPaymentSecretReference(
      form,
      providerCode,
      environment,
      `certificate-${normalizePaymentProviderSecretRefPart(certificateSerialNo)}`,
    );
  }
  return form.storedCredentialMode === profile.credentialMode ? form.storedCertificateRef.trim() || null : null;
}

function resolvePaymentWebhookSecretRef(
  form: PaymentProviderAccountFormState,
  profile: PaymentProviderCredentialProfile,
  providerCode: PaymentProviderCode,
  environment: PaymentProviderEnvironment,
): string | null {
  if (!showPaymentProviderCredentialField(profile, 'webhookSigningKey')) {
    return null;
  }
  if (form.webhookSigningKey.trim()) {
    return createPaymentSecretReference(form, providerCode, environment, profile.webhookPurpose ?? 'webhook-signing-key');
  }
  return form.storedWebhookSecretRef.trim() || null;
}

function hasRequiredPaymentCredentialFields(
  form: PaymentProviderAccountFormState,
  profile: PaymentProviderCredentialProfile,
): boolean {
  return profile.requiredFields.every((field) => paymentProviderCredentialFieldValue(form, field).trim().length > 0);
}

function paymentProviderCredentialFieldValue(
  form: PaymentProviderAccountFormState,
  field: PaymentProviderCredentialField,
): string {
  switch (field) {
    case 'paymentClientId':
      return form.paymentClientId;
    case 'paymentClientSecret':
      return form.paymentClientSecret;
    case 'rsaPrivateKey':
      return form.rsaPrivateKey;
    case 'rsaPublicKey':
      return form.rsaPublicKey;
    case 'aesKey':
      return form.aesKey;
    case 'webhookSigningKey':
      return form.webhookSigningKey;
    case 'certificateSerialNo':
      return form.certificateSerialNo;
    case 'paymentApiKey':
    default:
      return form.paymentApiKey;
  }
}

function createPaymentSecretReference(
  form: PaymentProviderAccountFormState,
  providerCode: PaymentProviderCode,
  environment: PaymentProviderEnvironment,
  purpose: string,
): string {
  return [
    'vault://payments',
    normalizePaymentProviderSecretRefPart(providerCode),
    normalizePaymentProviderSecretRefPart(environment),
    'account-pending',
    normalizePaymentProviderSecretRefPart(purpose),
  ].join('/');
}

function readCommerceOperationRequestNo(result: unknown): string {
  const data = readPaymentPayload(result);
  if (!isPaymentRecord(data)) {
    return 'accepted';
  }
  const payload = isPaymentRecord(data.item) ? data.item : data;
  const requestNo = payload.requestNo ?? payload.accountNo;
  return typeof requestNo === 'string' && requestNo.trim() ? requestNo.trim() : 'accepted';
}

function readPaymentPayload(value: unknown): unknown {
  if (!isPaymentRecord(value)) {
    return value;
  }
  return 'data' in value ? value.data : value;
}

function readPaymentProviderCodeOptions(result: unknown): readonly PaymentProviderOption[] {
  const data = readPaymentPayload(result);
  if (!isPaymentRecord(data) || !Array.isArray(data.items)) {
    return [];
  }
  const options: PaymentProviderOption[] = [];
  const seen = new Set<string>();
  for (const item of data.items) {
    if (!isPaymentRecord(item)) {
      continue;
    }
    const providerCode = readPaymentProviderCode(item.providerCode);
    if (!providerCode || seen.has(providerCode)) {
      continue;
    }
    const displayName = readRecordText(item, 'displayName') || providerCode;
    seen.add(providerCode);
    options.push({
      value: providerCode,
      label: displayName,
      providerType: readRecordText(item, 'providerType'),
      settlementType: readRecordText(item, 'settlementType'),
      supportedCountries: readStringArray(item.supportedCountries).map((value) => value.toUpperCase()),
      supportedCurrencies: readStringArray(item.supportedCurrencies).map((value) => value.toUpperCase()),
      capabilities: readStringArray(item.capabilities),
      status: readRecordText(item, 'status'),
    });
  }
  return options;
}

function readPaymentProviderCredentialMode(record: AdminResourceRecord): PaymentProviderCredentialMode {
  const certificateRef = readRecordText(record, 'certificateRef').toLowerCase();
  const secretRef = readRecordText(record, 'secretRef').toLowerCase();
  if (certificateRef || secretRef.includes('rsa')) {
    return 'rsa';
  }
  if (secretRef.includes('aes')) {
    return 'aes';
  }
  return 'api_key';
}

function readCertificateSerialNo(record: AdminResourceRecord): string {
  const certificateRef = readRecordText(record, 'certificateRef');
  const match = certificateRef.match(/certificate-([a-z0-9-]+)$/i);
  return match?.[1] ?? '';
}

function paymentProviderLogoStyle(
  providerCode: string,
  label: string,
): { className: string; mark: string } {
  switch (providerCode) {
    case 'wechat_pay':
      return { className: 'bg-emerald-500 text-white', mark: 'WP' };
    case 'alipay':
      return { className: 'bg-blue-500 text-white', mark: 'Ali' };
    case 'paypal':
      return { className: 'bg-[#003087] text-white', mark: 'PP' };
    case 'stripe':
      return { className: 'bg-[#635bff] text-white', mark: 'S' };
    case 'apple_pay':
      return { className: 'bg-slate-950 text-white dark:bg-white dark:text-slate-950', mark: 'AP' };
    case 'google_pay':
      return { className: 'bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-white dark:text-slate-900', mark: 'G' };
    default:
      return {
        className: 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200',
        mark: createPaymentProviderLogoInitials(label || providerCode),
      };
  }
}

function createPaymentProviderLogoInitials(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3)
    || 'P';
}

function firstPaymentProviderOption(options: readonly PaymentProviderOption[]): PaymentProviderOption | null {
  return options[0] ?? null;
}

function isPaymentRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readProviderAccountRecordId(record: AdminResourceRecord): string {
  return readRecordText(record, 'id') || readRecordText(record, 'accountNo');
}

function readRecordText(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function readStringArray(value: unknown): readonly string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function valuesToSelectOptions(values: readonly string[]): readonly PaymentProviderAccountSelectOption[] {
  return Array.from(new Set(values.filter(Boolean))).map((value) => ({ value, label: value }));
}

function requiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function requiredPaymentProviderCode(value: string): PaymentProviderCode {
  const normalized = requiredText(value, 'providerCode').toLowerCase() as PaymentProviderCode;
  if (!isPaymentProviderCode(normalized)) {
    throw new Error(`providerCode must be one of ${PAYMENT_PROVIDER_CODES.join(', ')}`);
  }
  return normalized;
}

function readPaymentProviderCode(value: unknown): PaymentProviderCode | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return isPaymentProviderCode(normalized) ? normalized : null;
}

function isPaymentProviderCode(value: string): value is PaymentProviderCode {
  return PAYMENT_PROVIDER_CODES.includes(value as PaymentProviderCode);
}

function requiredPaymentEnvironment(value: string): PaymentProviderEnvironment {
  const normalized = requiredText(value, 'environment').toLowerCase() as PaymentProviderEnvironment;
  if (!PAYMENT_PROVIDER_ENVIRONMENTS.includes(normalized)) {
    throw new Error(`environment must be one of ${PAYMENT_PROVIDER_ENVIRONMENTS.join(', ')}`);
  }
  return normalized;
}

function requiredPaymentStatus(value: string): PaymentProviderAccountStatus {
  const normalized = requiredText(value, 'status').toLowerCase() as PaymentProviderAccountStatus;
  if (!PAYMENT_PROVIDER_ACCOUNT_STATUSES.includes(normalized)) {
    throw new Error(`status must be one of ${PAYMENT_PROVIDER_ACCOUNT_STATUSES.join(', ')}`);
  }
  return normalized;
}

function requiredPaymentProviderAccountRole(value: string): PaymentProviderAccountRole {
  const normalized = requiredText(value, 'accountRole').toLowerCase() as PaymentProviderAccountRole;
  if (!PAYMENT_PROVIDER_ACCOUNT_ROLES.includes(normalized)) {
    throw new Error(`accountRole must be one of ${PAYMENT_PROVIDER_ACCOUNT_ROLES.join(', ')}`);
  }
  return normalized;
}

function formatPaymentProviderAccountRole(
  value: unknown,
  t: (key: string, fallback: string) => string,
): string {
  if (value === 'service_provider') {
    return t('admin.commerce.payments.providerAccounts.accountRole.serviceProvider', 'Service provider');
  }
  if (value === 'merchant') {
    return t('admin.commerce.payments.providerAccounts.accountRole.merchant', 'Merchant');
  }
  return '-';
}

function paymentProviderAccountChannelScopeLabel(record: AdminResourceRecord): string {
  return [
    readRecordText(record, 'providerCode') || '-',
    readRecordText(record, 'environment') || '-',
    readRecordText(record, 'countryCode') || '-',
    readRecordText(record, 'settlementCurrency') || '-',
  ].join(' / ');
}

function formatPaymentProviderAccountAvailability(
  record: AdminResourceRecord,
  t: (key: string, fallback: string) => string,
): string {
  const status = readRecordText(record, 'status');
  if (status === 'active') {
    return t(
      'admin.commerce.payments.providerAccounts.availability.activeOnly',
      'Only available account in this channel scope',
    );
  }
  if (status === 'disabled') {
    return t(
      'admin.commerce.payments.providerAccounts.availability.disabled',
      'Disabled',
    );
  }
  return t(
    'admin.commerce.payments.providerAccounts.availability.standby',
    'Standby account in this channel scope',
  );
}
