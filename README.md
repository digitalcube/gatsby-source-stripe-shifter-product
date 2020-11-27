# Gatsby Source Stripe Shifter Products

Simple source plugin to get Shifter product and plans from Stripe.

## Install


## Config

```js
module.exports = {
  plugins: [
    {
      resolve: 'gatsby-source-stripe-shifter-product',
      options: {
        stripeAPISecret: process.env.STRIPE_API_SECRET,
        stripeConfig: {
          apiVersion: '2020-08-27'
        }
      }
    },
...
```


## View

```jsx
export default (props) => {
    return (
          <ul>
            {props.data.allShifterStripeProduct.nodes.map(product => (
              <li key={product.id}>
                <b>{product.name}</b>
                <dl>
                  {product.plans.map(plan => (
                    <React.Fragment key={plan.id}>
                      <dd key={plan.id}><b>{plan.nickname}</b> {plan.amount / 100} per {plan.interval}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
    )
}

export const pageQuery = graphql`
  query IndexQuery {
    allShifterStripeProduct {
      nodes {
        productId
        productType
        name
        plans {
          id
          amount
          nickname
          interval
        }
      }
    }
  }
`
```

## Query

### Get All

```graphql
allShifterStripeProduct {
      nodes {
        productId
        productType
        name
        plans {
          id
          amount
          nickname
          interval
        }
      }
}
```
### Get Static 

```graphql
allShifterStripeProduct(filter: {productType: {eq: "static"}}) {
      nodes {
        productId
        productType
        name
        plans {
          id
          amount
          nickname
          interval
        }
      }
}
```

### Get Headless

```graphql
allShifterStripeProduct(filter: {productType: {eq: "headless"}}) {
      nodes {
        productId
        productType
        name
        plans {
          id
          amount
          nickname
          interval
        }
      }
}
```