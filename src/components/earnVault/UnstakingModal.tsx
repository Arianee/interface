import { TransactionResponse } from '@ethersproject/providers'
import { Trans } from '@lingui/macro'
import { ReactNode, useState } from 'react'
import styled from 'styled-components/macro'

import { useStakingContract, useVaultContract } from '../../hooks/useContract'
import { useActiveWeb3React } from '../../hooks/web3'
import { StakingInfo } from '../../state/stake/hooks'
import { TransactionType } from '../../state/transactions/actions'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { CloseIcon, ThemedText } from '../../theme'
import { ButtonError } from '../Button'
import { AutoColumn } from '../Column'
import FormattedCurrencyAmount from '../FormattedCurrencyAmount'
import Modal from '../Modal'
import { LoadingView, SubmittedView } from '../ModalViews'
import { RowBetween } from '../Row'
import { VaultInfo } from '../../state/vault/hooks'

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: VaultInfo
}

export default function UnstakingModal({ isOpen, onDismiss, stakingInfo }: StakingModalProps) {
  const { account } = useActiveWeb3React()

  // monitor call to help UI loading state
  const addTransaction = useTransactionAdder()
  const [hash, setHash] = useState<string | undefined>()
  const [attempting, setAttempting] = useState(false)

  function wrappedOndismiss() {
    setHash(undefined)
    setAttempting(false)
    onDismiss()
  }

  const vaultContract = useVaultContract(stakingInfo.stakingRewardAddress)

  async function onWithdraw() {
    if (vaultContract && stakingInfo?.stakedAmount) {
      setAttempting(true)
      await vaultContract
        .claim({ gasLimit: 300000 })
        .then((response: TransactionResponse) => {
          addTransaction(response, {
            type: TransactionType.WITHDRAW_LIQUIDITY_STAKING,
            token0Address: stakingInfo.tokens[0].address,
            token1Address: stakingInfo.tokens[0].address,
          })
          setHash(response.hash)
        })
        .catch((error: any) => {
          setAttempting(false)
          console.log(error)
        })
    }
  }

  let error: ReactNode | undefined
  if (!account) {
    error = <Trans>Connect a wallet</Trans>
  }
  if (!stakingInfo?.stakedAmount) {
    error = error ?? <Trans>Enter an amount</Trans>
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOndismiss} maxHeight={90}>
      {!attempting && !hash && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <ThemedText.MediumHeader>
              <Trans>Withdraw</Trans>
            </ThemedText.MediumHeader>
            <CloseIcon onClick={wrappedOndismiss} />
          </RowBetween>
          {stakingInfo?.stakedAmount && (
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body fontWeight={600} fontSize={36}>
                {<FormattedCurrencyAmount currencyAmount={stakingInfo.stakedAmount} />}
              </ThemedText.Body>
              <ThemedText.Body>
                <Trans>Deposited liquidity:</Trans>
              </ThemedText.Body>
            </AutoColumn>
          )}
          {stakingInfo?.earnedAmount && (
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body fontWeight={600} fontSize={36}>
                {<FormattedCurrencyAmount currencyAmount={stakingInfo?.earnedAmount} />}
              </ThemedText.Body>
              <ThemedText.Body>
                <Trans>Unclaimed {stakingInfo?.baseToken.symbol}</Trans>
              </ThemedText.Body>
            </AutoColumn>
          )}
          <ThemedText.SubHeader style={{ textAlign: 'center' }}>
            <Trans>When you withdraw, your {stakingInfo?.baseToken.symbol} is claimed and your liquidity is removed from the mining pool.</Trans>
          </ThemedText.SubHeader>
          <ButtonError disabled={!!error} error={!!error && !!stakingInfo?.stakedAmount} onClick={onWithdraw}>
            {error ?? <Trans>Withdraw & Claim</Trans>}
          </ButtonError>
        </ContentWrapper>
      )}
      {attempting && !hash && (
        <LoadingView onDismiss={wrappedOndismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <ThemedText.Body fontSize={20}>
              Withdrawing {stakingInfo?.stakedAmount?.toSignificant(4)} {stakingInfo?.baseToken.symbol}
            </ThemedText.Body>
            <ThemedText.Body fontSize={20}>
              Claiming {stakingInfo?.earnedAmount?.toSignificant(4)} {stakingInfo?.baseToken.symbol}
            </ThemedText.Body>
          </AutoColumn>
        </LoadingView>
      )}
      {hash && (
        <SubmittedView onDismiss={wrappedOndismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <ThemedText.LargeHeader>
              <Trans>Transaction Submitted</Trans>
            </ThemedText.LargeHeader>
            <ThemedText.Body fontSize={20}>
              Withdrew {stakingInfo?.baseToken.symbol}!
            </ThemedText.Body>
            <ThemedText.Body fontSize={20}>
              Claimed {stakingInfo?.baseToken.symbol}!
            </ThemedText.Body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
