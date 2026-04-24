import { useRef, useEffect } from 'react'
import { audioEngine } from '@/lib/audio-engine'
import { cn } from '@/lib/utils'

interface VisualizerProps {
  className?: string
  barCount?: number
  barColor?: string
}

export function Visualizer({ className, barCount = 32, barColor }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener('resize', resize)
    audioEngine.getAnalyser()

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const data = audioEngine.getAnalyserData()
      if (!data) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      const step = Math.floor(data.length / barCount)
      const bw = (width / barCount) * 0.7
      const gap = (width / barCount) * 0.3
      const color = barColor || 'rgba(124, 92, 255, 0.7)'

      for (let i = 0; i < barCount; i++) {
        const value = data[i * step] / 255
        const barHeight = value * height * 0.9
        const x = i * (bw + gap)
        const y = height - barHeight

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(x, y, bw, barHeight, 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [barCount, barColor])

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-full', className)}
      aria-hidden="true"
    />
  )
}
