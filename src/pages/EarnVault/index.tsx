import { Trans } from '@lingui/macro'
import styled from 'styled-components/macro'

import { OutlineCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import { CardBGImage, CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import PoolCard from '../../components/earnVault/PoolCard'
import Loader from '../../components/Loader'
import { RowBetween } from '../../components/Row'
import { useActiveWeb3React } from '../../hooks/web3'
import { useStakingContractConfigs, useVaultInfo } from '../../state/vault/hooks'
import { ThemedText } from '../../theme'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const TopSection = styled(AutoColumn)`
  max-width: 720px;
  width: 100%;
`

const PoolSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 10px;
  row-gap: 15px;
  width: 100%;
  justify-self: center;
`

const DataRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`

export default function EarnVault() {
  const { chainId } = useActiveWeb3React()

  // staking info for connected account
  const stakingInfos = useVaultInfo()

  /**
   * only show staking cards with balance
   * @todo only account for this if rewards are inactive
   */

  const VAULT_REWARDS_INFO = useStakingContractConfigs()
  //const stakingInfosWithBalance = stakingInfos?.filter((s) => JSBI.greaterThan(s.stakedAmount.quotient, BIG_INT_ZERO))
  const stakingInfosWithBalance = stakingInfos
  // toggle copy if rewards are inactive
  const stakingRewardsExist = Boolean(typeof chainId === 'number' && (VAULT_REWARDS_INFO[chainId]?.length ?? 0) > 0)

  return (
    <PageWrapper gap="lg" justify="center">
      <TopSection gap="md">
        <DataCard>
          <CardBGImage />
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <ThemedText.White fontWeight={600}>
                  <Trans>Aria20 Staking</Trans>
                </ThemedText.White>
              </RowBetween>
              <RowBetween>
                <ThemedText.White fontSize={14}>
                  <Trans>Deposit your Aria20 tokens to receive Aria20 in bonus. Yield depends on vesting period.</Trans>
                </ThemedText.White>
              </RowBetween>{' '}
            </AutoColumn>
          </CardSection>
          <CardBGImage />
          <CardNoise />
        </DataCard>
      </TopSection>

      <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
        <DataRow style={{ alignItems: 'baseline' }}>
          <ThemedText.MediumHeader style={{ marginTop: '0.5rem' }}>
            <Trans>Participating vaults</Trans>
          </ThemedText.MediumHeader>
        </DataRow>

        <PoolSection>
          {stakingRewardsExist && stakingInfos?.length === 0 ? (
            <Loader style={{ margin: 'auto' }} />
          ) : !stakingRewardsExist ? (
            <OutlineCard>
              <Trans>No active pools</Trans>
            </OutlineCard>
          ) : stakingInfos?.length !== 0 && stakingInfosWithBalance.length === 0 ? (
            <OutlineCard>
              <Trans>No active pools</Trans>
            </OutlineCard>
          ) : (
            stakingInfosWithBalance?.map((stakingInfo) => {
              // need to sort by added liquidity here
              return <PoolCard key={stakingInfo.stakingRewardAddress} vaultInfo={stakingInfo} />
            })
          )}
        </PoolSection>
      </AutoColumn>
    </PageWrapper>
  )
}
