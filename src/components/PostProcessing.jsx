import { EffectComposer, Bloom, Vignette, ToneMapping, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'

export default function PostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.3} luminanceThreshold={0.08} luminanceSmoothing={0.6} mipmapBlur={false} radius={0.06} levels={7} />
      <Bloom intensity={0.15} luminanceThreshold={0.02} luminanceSmoothing={0.9} mipmapBlur={false} radius={0.15} levels={5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} resolution={256} />
      <Vignette offset={0.3} darkness={0.35} blendFunction={BlendFunction.NORMAL} />
      <ChromaticAberration offset={[0.0004, 0.0002]} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  )
}
