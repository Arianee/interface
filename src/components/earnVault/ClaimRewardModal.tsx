import {TransactionResponse} from '@ethersproject/providers'
import {Trans} from '@lingui/macro'
import {ReactNode, useState} from 'react'
import styled from 'styled-components/macro'

import {useVaultContract} from '../../hooks/useContract'
import {useActiveWeb3React} from '../../hooks/web3'
import {TransactionType} from '../../state/transactions/actions'
import {useTransactionAdder} from '../../state/transactions/hooks'
import {VaultInfo} from '../../state/vault/hooks'
import {CloseIcon, ThemedText} from '../../theme'
import {ButtonError} from '../Button'
import {AutoColumn} from '../Column'
import Modal from '../Modal'
import {LoadingView, SubmittedView} from '../ModalViews'
import {RowBetween} from '../Row'

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: VaultInfo
}

export default function ClaimRewardModal({ isOpen, onDismiss, stakingInfo }: StakingModalProps) {
  const { account } = useActiveWeb3React()

  // monitor call to help UI loading state
  const addTransaction = useTransactionAdder()
  const [hash, setHash] = useState<string | undefined>()
  const [attempting, setAttempting] = useState(false)

  function wrappedOnDismiss() {
    setHash(undefined)
    setAttempting(false)
    onDismiss()
  }

  const vaultContract = useVaultContract(stakingInfo.stakingRewardAddress)

  async function onClaimReward() {
    if (vaultContract && stakingInfo?.stakedAmount && account) {
      setAttempting(true)
      await vaultContract
        .claim({ gasLimit: 350000 })
        .then((response: TransactionResponse) => {
          addTransaction(response, {
            type: TransactionType.CLAIM,
            recipient: account,
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
    error = <Trans>Connect Wallet</Trans>
  }
  if (!stakingInfo?.stakedAmount) {
    error = error ?? <Trans>Enter an amount</Trans>
  }


  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && !hash && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <ThemedText.MediumHeader>
              <Trans>Claim</Trans>
            </ThemedText.MediumHeader>
            <CloseIcon onClick={wrappedOnDismiss} />
          </RowBetween>
          {stakingInfo?.earnedAmount && (
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body fontWeight={600} fontSize={36}>
                {stakingInfo?.earnedAmount?.toSignificant(6)}
              </ThemedText.Body>
              <ThemedText.Body>
                Unclaimed {stakingInfo?.baseToken.symbol}
              </ThemedText.Body>
            </AutoColumn>
          )}
          <ThemedText.SubHeader style={{ textAlign: 'center' }}>
            Tokens staked and rewards can be linearly claimed over a period of {stakingInfo?.maturityPeriod} days
          </ThemedText.SubHeader>
          <ButtonError disabled={!!error} error={!!error && !!stakingInfo?.stakedAmount} onClick={onClaimReward}>
            {error ?? <Trans>Claim</Trans>}
          </ButtonError>
        </ContentWrapper>
      )}
      {attempting && !hash && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <ThemedText.Body fontSize={20}>
              <Trans>
                Claiming {stakingInfo?.earnedAmount?.toSignificant(6)} {stakingInfo?.baseToken.symbol}
              </Trans>
            </ThemedText.Body>
          </AutoColumn>
        </LoadingView>
      )}
      {hash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <ThemedText.LargeHeader>
              <Trans>Transaction Submitted</Trans>
            </ThemedText.LargeHeader>
            <ThemedText.Body fontSize={20}>
              <Trans>Claimed {stakingInfo?.baseToken.symbol}!</Trans>
            </ThemedText.Body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
