import { Interface } from '@ethersproject/abi'
import { Trans } from '@lingui/macro'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import { abi as VAULT_ABI } from 'abis/vaultAbi.json'
import useCurrentBlockTimestamp from 'hooks/useCurrentBlockTimestamp'
import JSBI from 'jsbi'
import { ReactNode, useEffect, useMemo, useState } from 'react'

import { SupportedChainId } from '../../constants/chains'
import { UNI } from '../../constants/tokens'
import { getMsDurantionInDays } from '../../hooks/useDifferenceInDays'
import { useActiveWeb3React } from '../../hooks/web3'
import { ListenerOptions } from '../multicall/actions'
import { NEVER_RELOAD, useMultipleContractSingleData } from '../multicall/hooks'
import { tryParseAmount } from '../swap/hooks'

const VAULT_REWARDS_INTERFACE = new Interface(VAULT_ABI)

interface VaultJSONInterface {
  stakingRewardAddress: string
  baseToken: Token
  tokens: [Token]
  vaultName: string
}
let cachePromise: any
export const useStakingContractConfigs = (): {
  [chainId: number]: VaultJSONInterface[]
} => {
  const url = 'https://raw.githubusercontent.com/Arianee/aria-staking/main/contract-list.json'
  const key = url
  const localeData = window.localStorage.getItem(key)
  const defaultData = {
    137: [],
    1: [],
    77: [],
  }
  const initialData = localeData ? JSON.parse(localeData) : defaultData

  const [data, setData] = useState<any>(initialData)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!cachePromise) {
          console.log('fetching')
          const result = await fetch(url)
          cachePromise = result.json()
        } else {
          console.log('not fetching')
          const jsonBody = await cachePromise
          console.log(jsonBody)
        }
        const jsonBody = await cachePromise

        setData(jsonBody)
        window.localStorage.setItem(key, JSON.stringify(jsonBody))
      } catch (e) {
        console.error(e)
      }
    }
    fetchData()
  }, [])

  return data
}

export interface VaultInfo {
  // Vault name
  vaultName: string
  // Base Token
  baseToken: Token
  // the address of the reward contract
  stakingRewardAddress: string
  // the tokens involved in this pair
  tokens: [Token]
  // the amount of token currently staked, or undefined if no account
  stakedAmount: CurrencyAmount<Token>
  // the amount of reward token earned by the active account, or undefined if no account
  earnedAmount: CurrencyAmount<Token>
  // the total amount of token staked in the contract
  totalStakedAmount: CurrencyAmount<Token>
  // the amount of token distributed per second to all LPs, constant
  totalRewardRate: CurrencyAmount<Token>
  // the current amount of token distributed to the active account per second.
  // equivalent to percent of total supply * reward rate
  rewardRate: CurrencyAmount<Token>
  // claimableAmount or claimableRewardAmount
  claimableAmount: CurrencyAmount<Token>
  // amount of token that was staked and can be withdraw if claim
  unlockedVestedTokenAmount: CurrencyAmount<Token>
  // when the period ends
  isStarted: boolean
  // vault genesis
  vaultLimit: CurrencyAmount<Token>
  // vault limit
  vaultGenesis: Date | undefined
  // availableLimit
  availableLimit: CurrencyAmount<Token>
  // if pool is active
  active: boolean
  // maturity period
  maturityPeriod: number
  // APR
  APR: number
  // calculates a hypothetical amount of token distributed to the active account per second.
  getHypotheticalRewardRate: (
    stakedAmount: CurrencyAmount<Token>,
    totalStakedAmount: CurrencyAmount<Token>,
    totalRewardRate: CurrencyAmount<Token>
  ) => CurrencyAmount<Token>
}

// gets the staking info from the network for the active chain id
export function useVaultInfo(stackingRewarAddress?: string): VaultInfo[] {
  const { chainId, account } = useActiveWeb3React()

  const VAULT_REWARDS_INFO = useStakingContractConfigs()
  // detect if staking is ended
  const currentBlockTimestamp = useCurrentBlockTimestamp()
  const info = useMemo(
    () =>
      chainId
        ? VAULT_REWARDS_INFO[chainId]?.filter((stakingRewardInfo) =>
            stackingRewarAddress === undefined ? true : stackingRewarAddress === stakingRewardInfo.stakingRewardAddress
          ) ?? []
        : [],
    [chainId, stackingRewarAddress]
  )

  const rewardsAddresses = useMemo(() => info.map(({ stakingRewardAddress }) => stakingRewardAddress), [info])

  const accountArg = useMemo(() => [account ?? undefined], [account])

  const blocksPerFetch = chainId === SupportedChainId.MAINNET ? 1 : 3
  const reloadTime: ListenerOptions = {
    blocksPerFetch,
  }
  // get all the info from the staking rewards contracts
  const balances = useMultipleContractSingleData(
    rewardsAddresses,
    VAULT_REWARDS_INTERFACE,
    'balanceOf',
    accountArg,
    reloadTime
  )

  const earnedAmounts = useMultipleContractSingleData(
    rewardsAddresses,
    VAULT_REWARDS_INTERFACE,
    'earned',
    accountArg,
    reloadTime
  )

  const totalDeposits = useMultipleContractSingleData(
    rewardsAddresses,
    VAULT_REWARDS_INTERFACE,
    'totalDeposits',
    undefined,
    reloadTime
  )
  // tokens per second, constants

  const rewardRates = useMultipleContractSingleData(
    rewardsAddresses,
    VAULT_REWARDS_INTERFACE,
    'rewardRate',
    undefined,
    NEVER_RELOAD
  )

  const periodStarts = useMultipleContractSingleData(
    rewardsAddresses,
    VAULT_REWARDS_INTERFACE,
    'vaultGenesis',
    undefined,
    NEVER_RELOAD
  )

  const vaultLimits = useMultipleContractSingleData(
    rewardsAddresses,
    VAULT_REWARDS_INTERFACE,
    'vaultLimit',
    undefined,
    NEVER_RELOAD
  )

  const vestingPeriods = useMultipleContractSingleData(
    rewardsAddresses,
    VAULT_REWARDS_INTERFACE,
    'vestingPeriod',
    undefined,
    NEVER_RELOAD
  )

  return useMemo(() => {
    if (!chainId || !VAULT_REWARDS_INFO[chainId]) return []

    return rewardsAddresses.reduce<VaultInfo[]>((memo, rewardsAddress, index) => {
      // these two are dependent on account
      const balanceState = balances[index]
      const earnedAmountState = earnedAmounts[index]

      const { chainId: tokenChainId, address, decimals, symbol, name } = VAULT_REWARDS_INFO[chainId][index].baseToken

      const baseToken = new Token(tokenChainId, address, decimals, symbol, name)
      // these get fetched regardless of account
      const totalSupplyState = totalDeposits[index]
      const rewardRateState = rewardRates[index]
      const periodStartState = periodStarts[index]

      const vaultLimitState = vaultLimits[index]
      const vestingPeriodState = vestingPeriods[index]

      if (
        // these may be undefined if not logged in
        !balanceState?.loading &&
        !earnedAmountState?.loading &&
        // always need these
        totalSupplyState &&
        !totalSupplyState.loading &&
        rewardRateState &&
        !rewardRateState.loading
      ) {
        if (balanceState?.error || earnedAmountState?.error || totalSupplyState.error || rewardRateState.error) {
          console.error('Failed to load staking rewards info')
          return memo
        }

        // check for account, if no account set to 0
        const stakedAmount = CurrencyAmount.fromRawAmount(baseToken, JSBI.BigInt(balanceState?.result?.[0] ?? 0))
        const totalDeposit = CurrencyAmount.fromRawAmount(baseToken, JSBI.BigInt(totalSupplyState.result?.[0]))
        const totalRewardRate = CurrencyAmount.fromRawAmount(baseToken, JSBI.BigInt(rewardRateState.result?.[0]))
        const vaultLimit = CurrencyAmount.fromRawAmount(baseToken, JSBI.BigInt(vaultLimitState.result?.[0]))

        const getHypotheticalRewardRate = (
          stakedAmount: CurrencyAmount<Token>,
          totalStakedAmount: CurrencyAmount<Token>,
          totalRewardRate: CurrencyAmount<Token>
        ): CurrencyAmount<Token> => {
          return CurrencyAmount.fromRawAmount(
            baseToken,
            JSBI.greaterThan(totalStakedAmount.quotient, JSBI.BigInt(0))
              ? JSBI.divide(JSBI.multiply(totalRewardRate.quotient, stakedAmount.quotient), totalStakedAmount.quotient)
              : JSBI.BigInt(0)
          )
        }

        const individualRewardRate = getHypotheticalRewardRate(stakedAmount, totalDeposit, totalRewardRate)

        const periodStartSeconds = periodStartState.result?.[0]?.toNumber()

        const isStarted =
          periodStartSeconds && currentBlockTimestamp ? periodStartSeconds < currentBlockTimestamp.toNumber() : true

        // compare period end timestamp vs current block timestamp (in seconds)
        const active = isStarted

        const vaultGenesisInMS = periodStartState ? periodStartState.result?.[0] * 1000 : 0

        const availableLimit =
          vaultLimit && totalDeposit
            ? vaultLimit.subtract(totalDeposit)
            : CurrencyAmount.fromRawAmount(baseToken, '0')

        const maturityPeriod = getMsDurantionInDays(vestingPeriodState?.result?.toString(), true)

        const APR =
          rewardRateState.result?.[0] && maturityPeriod ? (+rewardRateState.result?.[0] / maturityPeriod) * 365 : 0

        const claimableAmount = earnedAmountState?.result?.claimableAmount
        const unlockedVestedTokenAmount = earnedAmountState?.result?.unlockedVestedTokenAmount
        const claimableRewardAmount = earnedAmountState?.result?.claimableRewardAmount

        const floorAPR = Math.floor(APR)
        memo.push({
          vaultName: info[index].vaultName,
          stakingRewardAddress: rewardsAddress,
          tokens: info[index].tokens,
          unlockedVestedTokenAmount: CurrencyAmount.fromRawAmount(
            baseToken,
            JSBI.BigInt(unlockedVestedTokenAmount ?? 0)
          ),
          claimableAmount: CurrencyAmount.fromRawAmount(baseToken, JSBI.BigInt(claimableAmount ?? 0)),
          earnedAmount: CurrencyAmount.fromRawAmount(baseToken, JSBI.BigInt(claimableRewardAmount ?? 0)),
          rewardRate: individualRewardRate,
          totalRewardRate,
          stakedAmount,
          totalStakedAmount: totalDeposit,
          getHypotheticalRewardRate,
          active,
          APR: floorAPR,
          isStarted,
          vaultLimit,
          maturityPeriod,
          availableLimit,
          vaultGenesis: vaultGenesisInMS > 0 ? new Date(vaultGenesisInMS) : undefined,
          baseToken,
        })
      }
      return memo
    }, [])
  }, [
    balances,
    VAULT_REWARDS_INFO,
    chainId,
    currentBlockTimestamp,
    earnedAmounts,
    info,
    rewardRates,
    rewardsAddresses,
    totalDeposits,
  ])
}

export function useTotalUniEarned(): CurrencyAmount<Token> | undefined {
  const { chainId } = useActiveWeb3React()
  const uni = chainId ? UNI[chainId] : undefined
  const stakingInfos = useVaultInfo()

  return useMemo(() => {
    if (!uni) return undefined
    return (
      stakingInfos?.reduce(
        (accumulator, stakingInfo) => accumulator.add(stakingInfo.earnedAmount),
        CurrencyAmount.fromRawAmount(uni, '0')
      ) ?? CurrencyAmount.fromRawAmount(uni, '0')
    )
  }, [stakingInfos, uni])
}

// based on typed value
export function useDerivedStakeInfo(
  typedValue: string,
  stakingToken: Token | undefined,
  userLiquidityUnstaked: CurrencyAmount<Token> | undefined
): {
  parsedAmount?: CurrencyAmount<Token>
  error?: ReactNode
} {
  const { account } = useActiveWeb3React()

  const parsedInput: CurrencyAmount<Token> | undefined = tryParseAmount(typedValue, stakingToken)

  const parsedAmount =
    parsedInput && userLiquidityUnstaked && JSBI.lessThanOrEqual(parsedInput.quotient, userLiquidityUnstaked.quotient)
      ? parsedInput
      : undefined

  let error: ReactNode | undefined
  if (!account) {
    error = <Trans>Connect Wallet</Trans>
  }
  if (!parsedAmount) {
    error = error ?? <Trans>Enter an amount</Trans>
  }

  return {
    parsedAmount,
    error,
  }
}
