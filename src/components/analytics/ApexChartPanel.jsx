import { useEffect, useRef, useState } from 'react'
import ApexCharts from 'apexcharts'

export default function ApexChartPanel({ type, options, series, height = 420 }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const [chartError, setChartError] = useState(null)

  const hasRenderableData =
    Array.isArray(series) &&
    series.length > 0 &&
    series.some((item) => (Array.isArray(item?.data) ? item.data.length > 0 : item?.data !== undefined && item?.data !== null))

  useEffect(() => {
    if (!containerRef.current || !hasRenderableData) return undefined

    let active = true
    setChartError(null)

    const renderChart = async () => {
      const chartOptions = {
        ...options,
        chart: {
          ...(options?.chart || {}),
          height: height || options?.chart?.height || 420,
          zoom: {
            enabled: true,
            type: options?.chart?.zoom?.type || 'x',
            autoScaleYaxis: true,
          },
          toolbar: {
            show: true,
            autoSelected: 'zoom',
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true,
            },
          },
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 700,
          },
          fontFamily: 'Inter, ui-sans-serif, system-ui',
        },
        series,
      }

      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }

      if (!active || !containerRef.current) return

      try {
        chartRef.current = new ApexCharts(containerRef.current, chartOptions)
        await chartRef.current.render()
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to render ApexCharts', error)
        }
        setChartError(error instanceof Error ? error.message : 'No se pudo renderizar el gráfico')
      }
    }

    void renderChart()

    return () => {
      active = false
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [type, options, series, height, hasRenderableData])

  if (!hasRenderableData) {
    return (
      <div className="grid min-h-[18rem] place-items-center rounded-3xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-6 py-10 text-center text-sm text-slate-500">
        No hay datos suficientes para visualizar con los filtros actuales.
      </div>
    )
  }

  if (chartError) {
    return (
      <div className="grid min-h-[18rem] place-items-center rounded-3xl border border-dashed border-[#ece8f6] bg-[#fafafa] px-6 py-10 text-center text-sm text-slate-500">
        <div>
          <div className="font-semibold text-slate-700">El gráfico no pudo cargarse.</div>
          <div className="mt-1 text-xs text-slate-400">{chartError}</div>
        </div>
      </div>
    )
  }

  return <div ref={containerRef} />
}
