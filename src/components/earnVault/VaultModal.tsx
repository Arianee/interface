import { TransactionResponse } from '@ethersproject/providers'
import { Trans } from '@lingui/macro'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useCallback, useState } from 'react'
import styled from 'styled-components/macro'

import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { useV2RouterContract, useVaultContract } from '../../hooks/useContract'
import { useV2LiquidityTokenPermit } from '../../hooks/useERC20Permit'
import useTransactionDeadline from '../../hooks/useTransactionDeadline'
import { useActiveWeb3React } from '../../hooks/web3'
import { TransactionType } from '../../state/transactions/actions'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { useDerivedStakeInfo, VaultInfo } from '../../state/vault/hooks'
import { CloseIcon, ThemedText } from '../../theme'
import { formatCurrencyAmount } from '../../utils/formatCurrencyAmount'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { ButtonConfirmed, ButtonError } from '../Button'
import { AutoColumn } from '../Column'
import CurrencyInputPanel from '../CurrencyInputPanel'
import Modal from '../Modal'
import { LoadingView, SubmittedView } from '../ModalViews'
import ProgressCircles from '../ProgressSteps'
import { RowBetween } from '../Row'

const HypotheticalRewardRate = styled.div<{ dim: boolean }>`
  display: flex;
  justify-content: space-between;
  padding-right: 20px;
  padding-left: 20px;

  opacity: ${({ dim }) => (dim ? 0.5 : 1)};
`

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

interface VaultModalProps {
  isOpen: boolean
  onDismiss: () => void
  vaultInfo: VaultInfo
  userLiquidityUnstaked: CurrencyAmount<Token> | undefined
}

export default function VaultModal({ isOpen, onDismiss, vaultInfo, userLiquidityUnstaked }: VaultModalProps) {
  const { library } = useActiveWeb3React()

  // track and parse user input
  const [typedValue, setTypedValue] = useState('')
  const { parsedAmount, error } = useDerivedStakeInfo(
    typedValue,
    vaultInfo.stakedAmount.currency,
    userLiquidityUnstaked
  )
  const parsedAmountWrapped = parsedAmount?.wrapped

  let hypotheticalRewardRate: CurrencyAmount<Token> = CurrencyAmount.fromRawAmount(vaultInfo.rewardRate.currency, '0')
  if (parsedAmountWrapped?.greaterThan('0')) {
    hypotheticalRewardRate = vaultInfo.getHypotheticalRewardRate(
      vaultInfo.stakedAmount.add(parsedAmountWrapped),
      vaultInfo.totalStakedAmount.add(parsedAmountWrapped),
      vaultInfo.totalRewardRate
    )
  }

  // state for pending and submitted txn views
  const addTransaction = useTransactionAdder()
  const [attempting, setAttempting] = useState<boolean>(false)
  const [hash, setHash] = useState<string | undefined>()
  const wrappedOnDismiss = useCallback(() => {
    setHash(undefined)
    setAttempting(false)
    onDismiss()
  }, [onDismiss])

  // approval data for stake
  const deadline = useTransactionDeadline()
  const router = useV2RouterContract()
  const { signatureData, gatherPermitSignature } = useV2LiquidityTokenPermit(parsedAmountWrapped, router?.address)
  const [approval, approveCallback] = useApproveCallback(parsedAmount, vaultInfo.stakingRewardAddress)

  const stakingContract = useVaultContract(vaultInfo.stakingRewardAddress)
  async function onStake() {
    setAttempting(true)
    if (stakingContract && parsedAmount && deadline) {
      if (approval === ApprovalState.APPROVED) {
        const stakeResponse = await stakingContract.stake(`0x${parsedAmount.quotient.toString(16)}`, { gasLimit: 350000 })
        setHash(stakeResponse.hash)
      } else if (signatureData) {
        stakingContract
          .stake(
            `0x${parsedAmount.quotient.toString(16)}`,
            signatureData.deadline,
            signatureData.v,
            signatureData.r,
            signatureData.s,
            { gasLimit: 350000 }
          )
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              type: TransactionType.DEPOSIT_LIQUIDITY_STAKING,
              token0Address: vaultInfo.baseToken.address,
              token1Address: vaultInfo.baseToken.address,
            })
            setHash(response.hash)
          })
          .catch((error: any) => {
            setAttempting(false)
            console.log(error)
          })
      } else {
        setAttempting(false)
        throw new Error('Attempting to stake without approval or a signature. Please contact support.')
      }
    }
  }

  // wrapped onUserInput to clear signatures
  const onUserInput = useCallback((typedValue: string) => {
    setTypedValue(typedValue)
  }, [])

  // used for max input button
  const maxAmountInput = maxAmountSpend(userLiquidityUnstaked)
  const atMaxAmount = Boolean(maxAmountInput && parsedAmount?.equalTo(maxAmountInput))
  const handleMax = useCallback(() => {
    maxAmountInput && onUserInput(maxAmountInput.toExact())
  }, [maxAmountInput, onUserInput])

  async function onAttemptToApprove() {
    if (!library || !deadline) throw new Error('missing dependencies')
    if (!parsedAmount) throw new Error('missing liquidity amount')

    if (gatherPermitSignature) {
      try {
        await gatherPermitSignature()
      } catch (error) {
        // try to approve if gatherPermitSignature failed for any reason other than the user rejecting it
        if (error?.code !== 4001) {
          await approveCallback()
        }
      }
    } else {
      await approveCallback()
    }
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && !hash && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <ThemedText.MediumHeader>
              <Trans>Deposit</Trans>
            </ThemedText.MediumHeader>
            <CloseIcon onClick={wrappedOnDismiss} />
          </RowBetween>
          <CurrencyInputPanel
            value={typedValue}
            onUserInput={onUserInput}
            onMax={handleMax}
            showMaxButton={!atMaxAmount}
            currency={vaultInfo.stakedAmount.currency}
            label={''}
            renderBalance={(amount) => <Trans>Available to deposit: {formatCurrencyAmount(amount, 4)}</Trans>}
            id="stake-liquidity-token"
          />

          <RowBetween>
            <ButtonConfirmed
              mr="0.5rem"
              onClick={onAttemptToApprove}
              confirmed={approval === ApprovalState.APPROVED || signatureData !== null}
              disabled={approval !== ApprovalState.NOT_APPROVED || signatureData !== null}
            >
              <Trans>Approve</Trans>
            </ButtonConfirmed>
            <ButtonError
              disabled={!!error || (signatureData === null && approval !== ApprovalState.APPROVED)}
              error={!!error && !!parsedAmount}
              onClick={onStake}
            >
              {error ?? <Trans>Deposit</Trans>}
            </ButtonError>
          </RowBetween>
          <ProgressCircles steps={[approval === ApprovalState.APPROVED || signatureData !== null]} disabled={true} />
        </ContentWrapper>
      )}
      {attempting && !hash && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <ThemedText.LargeHeader>Depositing {vaultInfo?.baseToken.name}</ThemedText.LargeHeader>
            <ThemedText.Body fontSize={20}>
              {parsedAmount?.toSignificant(4)} {vaultInfo?.baseToken.symbol}
            </ThemedText.Body>
          </AutoColumn>
        </LoadingView>
      )}
      {attempting && hash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <ThemedText.LargeHeader>
              <Trans>Transaction Submitted</Trans>
            </ThemedText.LargeHeader>
            <ThemedText.Body fontSize={20}>
              <>Deposited {parsedAmount?.toSignificant(4)}  {vaultInfo?.baseToken.name}</>
            </ThemedText.Body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
