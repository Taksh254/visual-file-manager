import { useFrame, useThree } from '@react-three/fiber'
import { minimapSync } from '../systems/MinimapSync'

export default function MinimapCameraSync() {
  const { camera, controls } = useThree()

  useFrame(() => {
    minimapSync.update(camera, controls)
  })

  return null
}
