import {Trans} from '@lingui/macro'
import styled from 'styled-components/macro'

import {useColor} from '../../hooks/useColor'
import {VaultInfo} from '../../state/vault/hooks'
import {StyledInternalLink, ThemedText} from '../../theme'
import {unwrappedToken} from '../../utils/unwrappedToken'
import {ButtonPrimary} from '../Button'
import {AutoColumn} from '../Column'
import DoubleCurrencyLogo from '../DoubleLogo'
import {RowBetween} from '../Row'
import {Break, CardBGImage, CardNoise} from './styled'

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
  grid-template-columns: 24px 1fr 120px;
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
  const token0 = vaultInfo?.baseToken

  const currency0 = unwrappedToken(token0)

  const isStaking = Boolean(vaultInfo.stakedAmount.greaterThan('0'))
  const backgroundColor = useColor(token0)

  return (
    <Wrapper showBackground={isStaking} bgColor={backgroundColor}>
      <CardBGImage desaturate />
      <CardNoise />

      <TopSection>
        <DoubleCurrencyLogo currency0={currency0} size={24} />
        <ThemedText.White fontWeight={600} fontSize={24} style={{ marginLeft: '8px' }}>
          {vaultInfo?.vaultName}
        </ThemedText.White>

        <StyledInternalLink to={`/staking/${vaultInfo?.stakingRewardAddress}`} style={{ width: '100%' }}>
          <ButtonPrimary padding="8px" $borderRadius="8px">
            {isStaking ? <Trans>Manage</Trans> : <Trans>Deposit</Trans>}
          </ButtonPrimary>
        </StyledInternalLink>
      </TopSection>

      <StatContainer>
        <RowBetween>
          <ThemedText.White>
            <Trans>Launch Date</Trans>
          </ThemedText.White>
          <ThemedText.White>
            {vaultInfo?.vaultGenesis?.toLocaleDateString('en', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
          </ThemedText.White>
        </RowBetween>
        <RowBetween>
          <ThemedText.White>
            <Trans>Your Total Deposit</Trans>
          </ThemedText.White>
          <ThemedText.White>
            {vaultInfo?.totalStakedAmount.toFixed(0, { groupSeparator: ',' })} {vaultInfo?.baseToken.symbol}
          </ThemedText.White>
        </RowBetween>
        <RowBetween>
          <ThemedText.White>
            <Trans>Vault Limit</Trans>
          </ThemedText.White>
          <ThemedText.White>
            {vaultInfo?.vaultLimit.toFixed(0, { groupSeparator: ',' })} {vaultInfo?.baseToken.symbol}
          </ThemedText.White>
        </RowBetween>
        <RowBetween>
          <ThemedText.White>
            <Trans>Available limit</Trans>
          </ThemedText.White>
          <ThemedText.White>
            {vaultInfo?.availableLimit.toFixed(0, { groupSeparator: ',' })} {vaultInfo?.baseToken.symbol}
          </ThemedText.White>
        </RowBetween>
        <RowBetween>
          <ThemedText.White>
            <Trans>Maturity Period</Trans>
          </ThemedText.White>
          <ThemedText.White>{vaultInfo?.maturityPeriod} days</ThemedText.White>
        </RowBetween>
        <RowBetween>
          <ThemedText.White>
            <Trans>APR</Trans>
          </ThemedText.White>
          <ThemedText.White>
            {vaultInfo ? vaultInfo.active ? <span>{vaultInfo?.APR} %</span> : <span>0 %</span> : '-'}
          </ThemedText.White>
        </RowBetween>
      </StatContainer>

      {isStaking && (
        <>
          <Break />
          <BottomSection showBackground={true}>
            <ThemedText.Black color={'white'} fontWeight={500}>
              <span>
                <Trans>Your rate</Trans>
              </span>
            </ThemedText.Black>

            <ThemedText.Black style={{ textAlign: 'right' }} color={'white'} fontWeight={500}>
              <span role="img" aria-label="wizard-icon" style={{ marginRight: '0.5rem' }}>
                ⚡
              </span>
              {vaultInfo ? (
                vaultInfo.active ? (
                  <span>
                    {vaultInfo?.stakedAmount
                      ?.multiply(vaultInfo?.APR)
                      .divide(100)
                      .divide(365)
                      .multiply(7)
                      .toSignificant(4, { groupSeparator: ',' })}{' '}
                    {vaultInfo?.baseToken?.name} / week
                  </span>
                ) : (
                  <span>0 {vaultInfo?.baseToken?.name} / week</span>
                )
              ) : (
                '-'
              )}
            </ThemedText.Black>
          </BottomSection>
        </>
      )}
    </Wrapper>
  )
}
