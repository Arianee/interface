import {Trans} from '@lingui/macro'
import {CurrencyAmount, Token} from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import {useCallback, useState} from 'react'
import {Link, RouteComponentProps} from 'react-router-dom'
import styled from 'styled-components/macro'
import {CountUp} from 'use-count-up'

import {ButtonEmpty, ButtonPrimary} from '../../components/Button'
import {AutoColumn} from '../../components/Column'
import DoubleCurrencyLogo from '../../components/DoubleLogo'
import {CardBGImage, CardNoise, CardSection, DataCard} from '../../components/earn/styled'
import ClaimRewardModal from '../../components/earnVault/ClaimRewardModal'
import UnstakingModal from '../../components/earnVault/UnstakingModal'
import VaultModal from '../../components/earnVault/VaultModal'
import {RowBetween} from '../../components/Row'
import {BIG_INT_ZERO} from '../../constants/misc'
import {useColor} from '../../hooks/useColor'
import usePrevious from '../../hooks/usePrevious'
import {useTotalSupply} from '../../hooks/useTotalSupply'
import {useActiveWeb3React} from '../../hooks/web3'
import {useWalletModalToggle} from '../../state/application/hooks'
import {useVaultInfo} from '../../state/vault/hooks'
import {useTokenBalance} from '../../state/wallet/hooks'
import {ThemedText} from '../../theme'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const PositionInfo = styled(AutoColumn)<{ dim: any }>`
  position: relative;
  max-width: 640px;
  width: 100%;
  opacity: ${({ dim }) => (dim ? 0.6 : 1)};
`

const BottomSection = styled(AutoColumn)`
  border-radius: 12px;
  width: 100%;
  position: relative;
`

const StyledDataCard = styled(DataCard)<{ bgColor?: any; showBackground?: any }>`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #1e1a31 0%, #3d51a5 100%);
  z-index: 2;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  background: ${({ theme, bgColor, showBackground }) =>
    `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%,  ${showBackground ? theme.black : theme.bg5} 100%) `};
`

const StyledBottomCard = styled(DataCard)<{ dim: any }>`
  background: ${({ theme }) => theme.bg3};
  opacity: ${({ dim }) => (dim ? 0.4 : 1)};
  margin-top: -40px;
  padding: 0 1.25rem 1rem 1.25rem;
  padding-top: 32px;
  z-index: 1;
`

const PoolData = styled(DataCard)`
  background: none;
  border: 1px solid ${({ theme }) => theme.bg4};
  padding: 1rem;
  z-index: 1;
`

const VoteCard = styled(DataCard)`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #27ae60 0%, #000000 100%);
  overflow: hidden;
`

const DataRow = styled(RowBetween)`
  justify-content: center;
  gap: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    gap: 12px;
  `};
`

export default function Manage({
  match: {
    params: { rewardAddress },
  },
}: RouteComponentProps<{ rewardAddress: string }>) {
  const { account } = useActiveWeb3React()

  // get currencies and pair

  const vaultInfo = useVaultInfo(rewardAddress)[0]
  const currencyA = vaultInfo?.baseToken
  const vaultBaseToken: Token = vaultInfo?.baseToken
  // detect existing unstaked LP position to show add button if none found
  const userLiquidityUnstaked = useTokenBalance(account ?? undefined, vaultBaseToken)
  // TODO => redirect to buy aria
  const showAddLiquidityButton = Boolean(vaultInfo?.stakedAmount?.equalTo('0') && userLiquidityUnstaked?.equalTo('0'))
  // toggle for staking modal and unstaking modal
  const [showStakingModal, setShowStakingModal] = useState(false)
  const [showUnstakingModal, setShowUnstakingModal] = useState(false)
  const [showClaimRewardModal, setShowClaimRewardModal] = useState(false)

  // fade cards if nothing staked or nothing earned yet
  const disableTop = !vaultInfo?.stakedAmount || vaultInfo.stakedAmount.equalTo(JSBI.BigInt(0))

  const backgroundColor = useColor(vaultBaseToken)

  // get WETH value of staked LP tokens
  const totalSupplyOfStakingToken = useTotalSupply(vaultInfo?.stakedAmount?.currency)
  let valueOfTotalStakedAmountInWETH: CurrencyAmount<Token> | undefined

  const countUpAmount = vaultInfo?.earnedAmount?.toFixed(6) ?? '0'
  const countUpAmountPrevious = usePrevious(countUpAmount) ?? '0'

  const toggleWalletModal = useWalletModalToggle()

  const handleDepositClick = useCallback(() => {
    if (account) {
      setShowStakingModal(true)
    } else {
      toggleWalletModal()
    }
  }, [account, toggleWalletModal])

  return (
    <PageWrapper gap="lg" justify="center">
      <RowBetween style={{ gap: '24px' }}>
        <ThemedText.MediumHeader style={{ margin: 0 }}>{currencyA?.symbol} Staking</ThemedText.MediumHeader>
        <DoubleCurrencyLogo currency0={currencyA ?? undefined} size={24} />
      </RowBetween>

      <DataRow style={{ gap: '24px' }}>
        <PoolData>
          <AutoColumn gap="sm">
            <ThemedText.Body style={{ margin: 0 }}>
              <Trans>Total deposits</Trans>
            </ThemedText.Body>
            <ThemedText.Body fontSize={24} fontWeight={500}>
              {vaultInfo?.totalStakedAmount?.toFixed(0, { groupSeparator: ',' })} - {vaultInfo?.baseToken.symbol}
            </ThemedText.Body>
          </AutoColumn>
        </PoolData>
        <PoolData>
          <AutoColumn gap="sm">
            <ThemedText.Body style={{ margin: 0 }}>
              <Trans>Staking Rate</Trans>
            </ThemedText.Body>
            <ThemedText.Body fontSize={24} fontWeight={500}>
              {vaultInfo?.active ? (
                <>
                  {vaultInfo?.stakedAmount
                    ?.multiply(vaultInfo?.APR)
                    .divide(100)
                    .divide(365)
                    .multiply(7)
                    .toSignificant(4, { groupSeparator: ',' })}{' '}
                  {vaultInfo?.baseToken?.name} / week {vaultInfo?.baseToken.symbol} / week
                </>
              ) : (
                <>0 / week</>
              )}
            </ThemedText.Body>
          </AutoColumn>
        </PoolData>
      </DataRow>

      {showAddLiquidityButton && (
        <VoteCard>
          <CardBGImage />
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <ThemedText.White fontWeight={600}>
                  <>Step 1. Get {vaultInfo?.baseToken.symbol} tokens</>
                </ThemedText.White>
              </RowBetween>
              <RowBetween style={{ marginBottom: '1rem' }}>
                <ThemedText.White fontSize={14}>
                  {vaultInfo?.baseToken.symbol} tokens are required. Once you&apos;ve owned{' '}
                  {vaultInfo?.baseToken.symbol} you can stake your {vaultInfo?.baseToken.symbol} tokens on this page.
                </ThemedText.White>
              </RowBetween>
              <ButtonPrimary
                padding="8px"
                $borderRadius="8px"
                width={'fit-content'}
                as={Link}
                to={`/swap?outputCurrency=${vaultInfo?.baseToken.address}&use=V2`}
              >
                <>Swap {currencyA?.symbol} tokens</>
              </ButtonPrimary>
            </AutoColumn>
          </CardSection>
          <CardBGImage />
          <CardNoise />
        </VoteCard>
      )}

      {vaultInfo && (
        <>
          <VaultModal
            isOpen={showStakingModal}
            onDismiss={() => setShowStakingModal(false)}
            vaultInfo={vaultInfo}
            userLiquidityUnstaked={userLiquidityUnstaked}
          />
          <UnstakingModal
            isOpen={showUnstakingModal}
            onDismiss={() => setShowUnstakingModal(false)}
            stakingInfo={vaultInfo}
          />
          <ClaimRewardModal
            isOpen={showClaimRewardModal}
            onDismiss={() => setShowClaimRewardModal(false)}
            stakingInfo={vaultInfo}
          />
        </>
      )}

      <PositionInfo gap="lg" justify="center" dim={showAddLiquidityButton}>
        <BottomSection gap="lg" justify="center">
          <StyledDataCard disabled={disableTop} bgColor={backgroundColor} showBackground={!showAddLiquidityButton}>
            <CardSection>
              <CardBGImage desaturate />
              <CardNoise />
              <AutoColumn gap="md">
                <RowBetween>
                  <ThemedText.White fontWeight={600}>
                    <Trans>Your deposit</Trans>
                  </ThemedText.White>
                </RowBetween>
                <RowBetween style={{ alignItems: 'baseline' }}>
                  <ThemedText.White fontSize={36} fontWeight={600}>
                    {vaultInfo?.stakedAmount?.toSignificant(6) ?? '-'}
                  </ThemedText.White>
                  <ThemedText.White>
                    <Trans> {vaultInfo?.baseToken.symbol}</Trans>
                  </ThemedText.White>
                </RowBetween>
              </AutoColumn>
            </CardSection>
          </StyledDataCard>
          <StyledBottomCard dim={vaultInfo?.stakedAmount?.equalTo(JSBI.BigInt(0))}>
            <CardBGImage desaturate />
            <CardNoise />
            <AutoColumn gap="sm">
              <RowBetween>
                <div>
                  <ThemedText.Black>
                    <Trans>Your unclaimed Aria</Trans>
                  </ThemedText.Black>
                </div>
                {vaultInfo?.earnedAmount && JSBI.notEqual(BIG_INT_ZERO, vaultInfo?.earnedAmount?.quotient) && (
                  <ButtonEmpty
                    padding="8px"
                    $borderRadius="8px"
                    width="fit-content"
                    onClick={() => setShowClaimRewardModal(true)}
                  >
                    <Trans>Withdraw & Claim</Trans>
                  </ButtonEmpty>
                )}
              </RowBetween>
              <RowBetween style={{ alignItems: 'baseline' }}>
                <ThemedText.LargeHeader fontSize={36} fontWeight={600}>
                  <CountUp
                    key={countUpAmount}
                    isCounting
                    decimalPlaces={4}
                    start={parseFloat(countUpAmountPrevious)}
                    end={parseFloat(countUpAmount)}
                    thousandsSeparator={','}
                    duration={1}
                  />
                </ThemedText.LargeHeader>
                <ThemedText.Black fontSize={16} fontWeight={500}>
                  <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px ' }}>
                    ⚡
                  </span>

                  {vaultInfo?.active ? (
                    <>
                      {vaultInfo?.stakedAmount
                        ?.multiply(vaultInfo?.APR)
                        .divide(100)
                        .divide(365)
                        .multiply(7)
                        .toSignificant(4, { groupSeparator: ',' })}{' '}
                      {vaultInfo?.baseToken?.name} / week
                    </>
                  ) : (
                    <>0 Aria / week</>
                  )}
                </ThemedText.Black>
              </RowBetween>
            </AutoColumn>
          </StyledBottomCard>
        </BottomSection>
        <ThemedText.Main style={{ textAlign: 'center' }} fontSize={14}>
          <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px' }}>
            ⭐️
          </span>
          Tokens staked and rewards can be linearly claimed over a period of {vaultInfo?.maturityPeriod} days. When you
          withdraw, the contract will automagically claim {vaultInfo?.baseToken.name} on your behalf!
        </ThemedText.Main>

        {!showAddLiquidityButton && (
          <DataRow style={{ marginBottom: '1rem' }}>
            {vaultInfo && vaultInfo.active && (
              <ButtonPrimary padding="8px" $borderRadius="8px" width="160px" onClick={handleDepositClick}>
                {vaultInfo?.stakedAmount?.greaterThan(JSBI.BigInt(0)) ? (
                  <>Deposit {vaultInfo?.baseToken.name}</>
                ) : (
                  <>Deposit {vaultInfo?.baseToken.name}</>
                )}
              </ButtonPrimary>
            )}

            {vaultInfo?.stakedAmount?.greaterThan(JSBI.BigInt(0)) && (
              <>
                <ButtonPrimary
                  padding="8px"
                  $borderRadius="8px"
                  width="160px"
                  onClick={() => setShowClaimRewardModal(true)}
                >
                  <Trans>Withdraw & Claim</Trans>
                </ButtonPrimary>
              </>
            )}
          </DataRow>
        )}
        {!userLiquidityUnstaked ? null : userLiquidityUnstaked.equalTo('0') ? null : !vaultInfo?.active ? null : (
          <ThemedText.Main>
            {userLiquidityUnstaked.toSignificant(6)} {vaultInfo?.baseToken.symbol} tokens available
          </ThemedText.Main>
        )}
      </PositionInfo>
    </PageWrapper>
  )
}
