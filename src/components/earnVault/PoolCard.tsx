import { Trans } from '@lingui/macro'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import styled from 'styled-components/macro'

import { BIG_INT_SECONDS_IN_WEEK } from '../../constants/misc'
import { useColor } from '../../hooks/useColor'
import { useDifferenceInDays } from '../../hooks/useDifferenceInDays'
import { useTotalSupply } from '../../hooks/useTotalSupply'
import useUSDCPrice from '../../hooks/useUSDCPrice'
import { useV2Pair } from '../../hooks/useV2Pairs'
import { VaultInfo } from '../../state/vault/hooks'
import { StyledInternalLink, ThemedText } from '../../theme'
import { unwrappedToken } from '../../utils/unwrappedToken'
import { ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import DoubleCurrencyLogo from '../DoubleLogo'
import { RowBetween } from '../Row'
import { Break, CardBGImage, CardNoise } from './styled'

const StatContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 1rem;
  margin-right: 1rem;
  margin-left: 1rem;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  display: none;
`};
`

const Wrapper = styled(AutoColumn)<{ showBackground: boolean; bgColor: any }>`
  border-radius: 12px;
  width: 100%;
  overflow: hidden;
  position: relative;
  opacity: ${({ showBackground }) => (showBackground ? '1' : '1')};
  background: ${({ theme, bgColor, showBackground }) =>
    `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%, ${showBackground ? theme.black : theme.bg5} 100%) `};
  color: ${({ theme, showBackground }) => (showBackground ? theme.white : theme.text1)} !important;

  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
`

const TopSection = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr 120px;
  grid-gap: 0px;
  align-items: center;
  padding: 1rem;
  z-index: 1;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 48px 1fr 96px;
  `};
`

const BottomSection = styled.div<{ showBackground: boolean }>`
  padding: 12px 16px;
  opacity: ${({ showBackground }) => (showBackground ? '1' : '0.4')};
  border-radius: 0 0 12px 12px;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  z-index: 1;
`

export default function PoolCard({ vaultInfo }: { vaultInfo: VaultInfo }) {
  const token0 = vaultInfo.tokens[0]

  const currency0 = unwrappedToken(token0)

  const isStaking = Boolean(vaultInfo.stakedAmount.greaterThan('0'))
  const backgroundColor = useColor(token0)

  const totalSupplyOfStakingToken = useTotalSupply(vaultInfo.stakedAmount.currency)
  const [, stakingTokenPair] = useV2Pair(...vaultInfo.tokens)

  const differenceInDays = useDifferenceInDays(vaultInfo?.vaultGenesis, vaultInfo?.periodFinish)
  const remainingPeriod = useDifferenceInDays(new Date(), vaultInfo?.periodFinish)

  return (
    <Wrapper showBackground={isStaking} bgColor={backgroundColor}>
      <CardBGImage desaturate />
      <CardNoise />

      <TopSection>
        <DoubleCurrencyLogo currency0={currency0} size={24} />
        <ThemedText.white fontWeight={600} fontSize={24} style={{ marginLeft: '8px' }}>
          {currency0.symbol}
        </ThemedText.white>

        <StyledInternalLink to={`/uni/${vaultInfo?.stakingRewardAddress}`} style={{ width: '100%' }}>
          <ButtonPrimary padding="8px" $borderRadius="8px">
            {isStaking ? <Trans>Manage</Trans> : <Trans>Deposit</Trans>}
          </ButtonPrimary>
        </StyledInternalLink>
      </TopSection>

      <StatContainer>
        <RowBetween>
          <ThemedText.white>
            <Trans>Launch Date</Trans>
          </ThemedText.white>
          <ThemedText.white>
            {vaultInfo?.vaultGenesis?.toLocaleDateString('en', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
          </ThemedText.white>
        </RowBetween>
        <RowBetween>
          <ThemedText.white>
            <Trans>Total deposited</Trans>
          </ThemedText.white>
          <ThemedText.white>
            {vaultInfo?.totalStakedAmount.toFixed(0, { groupSeparator: ',' })} {vaultInfo?.baseToken.symbol}
          </ThemedText.white>
        </RowBetween>
        <RowBetween>
          <ThemedText.white>
            <Trans>Vault Limit</Trans>
          </ThemedText.white>
          <ThemedText.white>{vaultInfo?.vaultLimit.toFixed(0, { groupSeparator: ',' })}</ThemedText.white>
        </RowBetween>
        <RowBetween>
          <ThemedText.white>
            <Trans>Availaible limit</Trans>
          </ThemedText.white>
          <ThemedText.white>{vaultInfo?.availableLimit.toFixed(0, { groupSeparator: ',' })}</ThemedText.white>
        </RowBetween>
        <RowBetween>
          <ThemedText.white>
            <Trans>Maturity Period</Trans>
          </ThemedText.white>
          <ThemedText.white>{differenceInDays} days</ThemedText.white>
        </RowBetween>
        <RowBetween>
          <ThemedText.white>
            <Trans>Remaining Period</Trans>
          </ThemedText.white>
          <ThemedText.white>{remainingPeriod} days</ThemedText.white>
        </RowBetween>
        <RowBetween>
          <ThemedText.white>
            <Trans>APR</Trans>
          </ThemedText.white>
          <ThemedText.white>
            {vaultInfo ? (
              vaultInfo.active ? (
                <Trans>
                  {vaultInfo.totalRewardRate?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toFixed(2, { groupSeparator: ',' })}{' '}
                  Aria / week
                </Trans>
              ) : (
                <Trans>0 Aria / week</Trans>
              )
            ) : (
              '-'
            )}
          </ThemedText.white>
        </RowBetween>
      </StatContainer>

      {isStaking && (
        <>
          <Break />
          <BottomSection showBackground={true}>
            <ThemedText.black color={'white'} fontWeight={500}>
              <span>
                <Trans>Your rate</Trans>
              </span>
            </ThemedText.black>

            <ThemedText.black style={{ textAlign: 'right' }} color={'white'} fontWeight={500}>
              <span role="img" aria-label="wizard-icon" style={{ marginRight: '0.5rem' }}>
                ⚡
              </span>
              {vaultInfo ? (
                vaultInfo.active ? (
                  <Trans>
                    {vaultInfo.rewardRate?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toSignificant(4, { groupSeparator: ',' })}{' '}
                    Aria / week
                  </Trans>
                ) : (
                  <Trans>0 Aria / week</Trans>
                )
              ) : (
                '-'
              )}
            </ThemedText.black>
          </BottomSection>
        </>
      )}
    </Wrapper>
  )
}
