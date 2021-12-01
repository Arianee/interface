import { BigNumber } from '@ethersproject/bignumber'

import { useSingleCallResult } from '../state/multicall/hooks'
import { useMulticall2Contract } from './useContract'

// gets the current timestamp from the blockchain
export default function useCurrentBlockTimestamp(): BigNumber | undefined {
  const multicall = useMulticall2Contract()
  //return BigNumber.from('0x61a788d1')
  return useSingleCallResult(multicall, 'getCurrentBlockTimestamp')?.result?.[0]
}
