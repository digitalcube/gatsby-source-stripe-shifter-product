import { SourceNodesArgs } from "gatsby";
import Stripe from "stripe";

export type ShifterProductPluginOption = {
    stripeAPISecret: string;
    stripeConfig: Stripe.StripeConfig;
    nodeType?: string;
    additionalProductIds?: string[];
    dropMetadataKeys?: string[];
    replaceMetadataItems?: Array<{
        key: string;
        value: string;
        condition: {
            operator: 'lt' | 'lte' | 'eq' | 'gt' | 'gte',
            value: string;
            variant?: 'number' | 'string'
        }
    }>
}

const defaultOptions = {
    nodeType: 'ShifterStripeProduct',
    additionalProductIds: [],
    dropMetadataKeys: ['user_limit', 'backup', 'projects_limit', 'gatsby_support', 'slack_notification', 'enable_subuser'],
    replaceMetadataItems:  [{
        key: 'max_media_storage_gb',
        value: 'Unlimited',
        condition: {
          operator: 'lt',
          value: '0',
          variant: 'number'
        }
      }]
}

export const sourceNodes = async (args: SourceNodesArgs, options: ShifterProductPluginOption): Promise<void> => {
  const {
    createNodeId,
    actions: {
      createNode,
    },
    createContentDigest,
  } = args
  const {
      stripeConfig,
      stripeAPISecret,
      nodeType,
      dropMetadataKeys,
      replaceMetadataItems,
      additionalProductIds,
  } = Object.assign({}, defaultOptions, options)
  if (!stripeConfig.apiVersion) {
      stripeConfig.apiVersion = '2020-08-27'
  }
  const stripe = new Stripe(stripeAPISecret, stripeConfig)
  const publishableProductIds = [
    // free dev
    'prod_BTjousBnAy46AC',
    // free prod
    'prod_BTcvVC4JyGnOXW',
    // Static Tier plans
    'tier_01',
    'tier_02',
    'tier_03',
    // Headless plans
    'hl_tier_01',
    'hl_tier_02',
    'hl_tier_03',
    ...additionalProductIds,
  ]
  const products = await Promise.all(publishableProductIds.map(async productId => {
    try {
      const product = await stripe.products.retrieve(productId)
      return product
    } catch (e) {
      if (e.code === 'resource_missing' && /prod/.test(productId)) {
        return null;
      }
      console.log(e)
      throw e
    }
  })).then(data => data.filter(Boolean))
  const datasets = await Promise.all(products.map(async (product) => {
      if (!product) return null;
    const {data: plans } = await stripe.plans.list({
      product: typeof product === 'string' ? product : product.id,
      active: true
    })
    if (!product.metadata || Object.keys(product.metadata).length < 1) {
        if (product.metadata === null) product.metadata = {}
        if (plans[0].metadata) {
            product.metadata = plans[0].metadata
        }
    }
    dropMetadataKeys.forEach(key => {
      if (key in product.metadata) {
        delete product.metadata[key]
      }
    })
    replaceMetadataItems.forEach(replacedItem => {
      if (replacedItem.key in product.metadata) {
        const itemValue = replacedItem.condition.variant === 'number' ? Number(replacedItem.condition.value) : replacedItem.condition.value
        const targetValue = replacedItem.condition.variant === 'number' ? Number(product.metadata[replacedItem.key]): product.metadata[replacedItem.key]
        switch (replacedItem.condition.operator) {
          case 'eq': {
            if (itemValue !== targetValue) break;
            return;
          }
          case 'gt': {
            if (itemValue < targetValue) break;
            return;
          }
          case 'gte': {
            if (itemValue <= targetValue) break;
            return;
          }
          case 'lt': {
            if (itemValue > targetValue) break;
            return;
          }
          case 'lte': {
            if (itemValue >= targetValue) break;
            return;
          }
          default:
            return;
        }
        product.metadata[replacedItem.key] = replacedItem.value
      }
    })
    return {
      ...product,
      plans: plans.map(plan => {
        if (plan.metadata) {
            plan.metadata = null
        }
        return plan
      })
    }
  }))
  datasets.forEach(product => {
      if (!product) return;
    const data = {
      ...product,
      id: createNodeId(`${nodeType}${product.id}`),
      productId: product.id,
      productType: (() => {
        if (/^tier/.test(product.id)) return 'static'
        if (/^hl/.test(product.id)) return 'headless'
        return 'static'
      })(),
    }
    createNode({
      ...data,
      internal: {
        type: nodeType,
        contentDigest: createContentDigest(data)
      }
    })
  })
  return undefined;
}