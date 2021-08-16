import type {
  ProductOption,
  ProductOptionValues,
} from '@commerce/types/product'
import type {
  JsonApiDocument,
  JsonApiResponse,
} from '@spree/storefront-api-v2-sdk/types/interfaces/JsonApi'
import type { RelationType } from '@spree/storefront-api-v2-sdk/types/interfaces/Relationships'
import SpreeResponseContentError from '../errors/SpreeResponseContentError'
import { findIncluded } from './jsonApi'

const isColorProductOption = (productOption: ProductOption) => {
  return productOption.displayName === 'Color'
}

const expandOptions = (
  spreeSuccessResponse: JsonApiResponse,
  spreeOptionValue: JsonApiDocument,
  accumulatedOptions: ProductOption[]
): ProductOption[] => {
  const spreeOptionTypeIdentifier = spreeOptionValue.relationships.option_type
    .data as RelationType

  const existingOptionIndex = accumulatedOptions.findIndex(
    (option) => option.id == spreeOptionTypeIdentifier.id
  )

  let option: ProductOption

  if (existingOptionIndex === -1) {
    const spreeOptionType = findIncluded(
      spreeSuccessResponse,
      spreeOptionTypeIdentifier.type,
      spreeOptionTypeIdentifier.id
    )

    if (!spreeOptionType) {
      throw new SpreeResponseContentError(
        `Option type with id ${spreeOptionTypeIdentifier.id} not found.`
      )
    }

    option = {
      id: spreeOptionType.id,
      displayName: spreeOptionType.attributes.presentation,
      values: [],
    }
  } else {
    const existingOption = accumulatedOptions[existingOptionIndex]

    option = existingOption
  }

  let optionValue: ProductOptionValues

  const label = isColorProductOption(option)
    ? spreeOptionValue.attributes.name
    : spreeOptionValue.attributes.presentation

  const productOptionValueExists = option.values.some(
    (optionValue: ProductOptionValues) => optionValue.label === label
  )

  if (!productOptionValueExists) {
    if (isColorProductOption(option)) {
      optionValue = {
        label,
        hexColors: [spreeOptionValue.attributes.presentation],
      }
    } else {
      optionValue = {
        label,
      }
    }

    if (existingOptionIndex === -1) {
      return [
        ...accumulatedOptions,
        {
          ...option,
          values: [optionValue],
        },
      ]
    }

    const expandedOptionValues = [...option.values, optionValue]
    const expandedOptions = [...accumulatedOptions]

    expandedOptions[existingOptionIndex] = {
      ...option,
      values: expandedOptionValues,
    }

    return expandedOptions
  }

  return accumulatedOptions
}

export default expandOptions
