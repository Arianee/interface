import { Trans } from '@lingui/macro'
import styled from 'styled-components/macro'

import { OutlineCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import { CardBGImage, CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import PoolCard from '../../components/earnVault/PoolCard'
import Loader from '../../components/Loader'
import { RowBetween } from '../../components/Row'
import { useActiveWeb3React } from '../../hooks/web3'
import { useVaultInfo, VAULT_REWARDS_INFO } from '../../state/vault/hooks'
import { ExternalLink, ThemedText } from '../../theme'
import { Countdown } from './Countdown'

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
                  <Trans>Uniswap liquidity mining</Trans>
                </ThemedText.White>
              </RowBetween>
              <RowBetween>
                <ThemedText.White fontSize={14}>
                  <Trans>
                    Deposit your Liquidity Provider tokens to receive ARIA (hard coded), the Uniswap protocol governance
                    token.
                  </Trans>
                </ThemedText.White>
              </RowBetween>{' '}
              <ExternalLink
                style={{ color: 'white', textDecoration: 'underline' }}
                href="https://uniswap.org/blog/uni/"
                target="_blank"
              >
                <ThemedText.White fontSize={14}>
                  <Trans>Read more about UNI</Trans>
                </ThemedText.White>
              </ExternalLink>
            </AutoColumn>
          </CardSection>
          <CardBGImage />
          <CardNoise />
        </DataCard>
      </TopSection>

      <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
        <DataRow style={{ alignItems: 'baseline' }}>
          <ThemedText.MediumHeader style={{ marginTop: '0.5rem' }}>
            <Trans>Participating pools</Trans>
          </ThemedText.MediumHeader>
          <Countdown exactEnd={stakingInfos?.[0]?.periodFinish} />
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
