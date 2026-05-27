import { useState, useEffect } from 'react'
import useUniverseStore from '../store/useUniverseStore'

const row = (label, val) => (
  <div style={{
    display:'flex',justifyContent:'space-between',alignItems:'center',
    padding:'4px 14px',fontSize:9,fontFamily:"'SF Mono','Menlo',monospace",
  }}>
    <span style={{color:'rgba(255,255,255,0.15)',fontSize:7,textTransform:'uppercase',letterSpacing:'1.5px'}}>{label}</span>
    <span style={{color:'rgba(255,255,255,0.4)'}}>{val}</span>
  </div>
)

export default function HoloSidebar() {
  const activeClusterId = useUniverseStore(s => s.activeClusterId)
  const selectedFile = useUniverseStore(s => s.selectedFile)
  const clusters = useUniverseStore(s => s.clusters)
  const clusterStats = useUniverseStore(s => s.clusterStats)

  const [time, setTime] = useState(new Date().toLocaleTimeString())
  useEffect(()=>{const i=setInterval(()=>setTime(new Date().toLocaleTimeString()),1000); return ()=>clearInterval(i)},[])

  const totalFiles = clusters ? Object.values(clusters).reduce((s,c)=>s+(c.fileCount || 0),0) : 0
  const totalClusters = clusters ? Object.keys(clusters).length : 0

  return (
    <div style={{
      position:'fixed',top:0,left:0,bottom:0,width:180,
      display:'flex',flexDirection:'column',pointerEvents:'none',zIndex:10,
      fontFamily:"'SF Mono','Menlo',monospace",
    }}>
      <div style={{
        flex:1, margin:12, borderRadius:10,
        background:'rgba(2,6,18,0.35)',
        backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)',
        border:'1px solid rgba(120,80,255,0.06)',
        display:'flex',flexDirection:'column',overflow:'hidden',
      }}>
        <div style={{padding:'16px 14px 10px', borderBottom:'1px solid rgba(120,80,255,0.04)'}}>
          <div style={{fontSize:14, fontWeight:200, letterSpacing:'5px', color:'rgba(255,255,255,0.7)'}}>
            EDITH
          </div>
          <div style={{fontSize:6, color:'rgba(120,80,255,0.25)', letterSpacing:'2.5px', marginTop:3, textTransform:'uppercase'}}>
            Visual File System
          </div>
        </div>

        <div style={{flex:1, overflow:'auto', padding:'6px 0'}}>
          <div style={{padding:'0 14px', marginBottom:8}}>
            <div style={{fontSize:6,color:'rgba(120,80,255,0.3)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:6}}>
              Clusters
            </div>
            {clusters && Object.values(clusters).map(c=>{
              const hex=`rgb(${c.color.r*255|0},${c.color.g*255|0},${c.color.b*255|0})`
              const isActive = activeClusterId === c.id
              return (
                <div key={c.id} style={{
                  display:'flex',alignItems:'center',padding:'5px 0',
                  opacity: isActive ? 0.9 : 0.4,
                  transition:'opacity 0.3s',
                }}>
                  <div style={{width:3,height:3,borderRadius:'50%',background:hex,boxShadow:`0 0 6px ${hex}`,marginRight:8,flexShrink:0}}/>
                  <span style={{fontSize:9,color:isActive?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.3)',letterSpacing:'0.8px',fontWeight:isActive?300:200}}>
                    {c.name}
                  </span>
                  <span style={{marginLeft:'auto',fontSize:7,color:'rgba(255,255,255,0.1)'}}>
                    {c.fileCount || 0}
                  </span>
                </div>
              )
            })}
          </div>

          {selectedFile && (
            <div style={{padding:'8px 14px', marginTop:4}}>
              <div style={{fontSize:6,color:'rgba(120,80,255,0.3)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:6}}>
                Selected
              </div>
              <div style={{background:'rgba(120,80,255,0.03)',borderRadius:6,border:'1px solid rgba(120,80,255,0.06)',padding:10}}>
                <div style={{fontSize:10,color:'#fff',marginBottom:3,wordBreak:'break-all',fontWeight:300}}>
                  {selectedFile.name}
                </div>
                <div style={{fontSize:8,color:'rgba(255,255,255,0.25)'}}>
                  {selectedFile.size}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{borderTop:'1px solid rgba(120,80,255,0.04)',padding:'4px 0'}}>
          {row('TIME', time)}
          {row('CLUSTERS', `${totalClusters}`)}
          {row('FILES', `${totalFiles}`)}
          {row('STATUS', clusterStats ? '● ONLINE' : '○ OFFLINE')}
        </div>
      </div>
    </div>
  )
}
