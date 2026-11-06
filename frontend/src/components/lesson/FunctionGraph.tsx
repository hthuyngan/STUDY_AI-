import React, { useMemo } from 'react'
import { LineChart, Sparkles } from 'lucide-react'
import { MathView } from '@/components/common/MathView'
import './FunctionGraph.css'

export type FunctionType = 'cubic' | 'rational' | 'custom'

export interface KeyPoint {
  x: number
  y: number
  label: string
  type: 'max' | 'min' | 'inflection' | 'intercept' | 'asymptote_center'
}

export interface AsymptoteLine {
  type: 'vertical' | 'horizontal'
  value: number
  label: string
}

export interface FunctionGraphProps {
  id?: string
  title: string
  functionFormula: string // e.g. "y = -x^3 + 3x - 1"
  functionType: FunctionType
  // Math function evaluated: y = fn(x)
  fn?: (x: number) => number | null
  domain?: [number, number] // e.g. [-3, 3]
  range?: [number, number] // e.g. [-5, 4]
  keyPoints?: KeyPoint[]
  asymptotes?: AsymptoteLine[]
  note?: string
  onAskAI?: (title: string, summary: string) => void
}

export const FunctionGraph: React.FC<FunctionGraphProps> = ({
  id,
  title,
  functionFormula,
  functionType,
  fn,
  domain = [-3, 3],
  range = [-4, 4],
  keyPoints = [],
  asymptotes = [],
  note,
  onAskAI,
}) => {
  // SVG canvas dimensions
  const width = 500
  const height = 340
  const padding = 40

  const [xMin, xMax] = domain
  const [yMin, yMax] = range

  // Coordinate transformations from Math (x, y) to SVG (px, py)
  const toSvgX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding)
  const toSvgY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding)

  // Default mathematical evaluators based on functionType if not provided
  const evaluate = useMemo(() => {
    if (fn) return fn
    if (functionType === 'cubic') {
      // Default: y = -x^3 + 3x - 1
      return (x: number) => -Math.pow(x, 3) + 3 * x - 1
    }
    if (functionType === 'rational') {
      // Default: y = (2x - 1) / (x + 1)
      return (x: number) => {
        if (Math.abs(x - (-1)) < 0.05) return null // Asymptote at x = -1
        return (2 * x - 1) / (x + 1)
      }
    }
    return (x: number) => x
  }, [fn, functionType])

  // Generate SVG path for the curve
  const curvePaths = useMemo(() => {
    const paths: string[] = []
    const step = 0.05
    let currentPath = ''

    for (let x = xMin; x <= xMax; x += step) {
      const y = evaluate(x)
      if (y === null || isNaN(y) || y < yMin - 10 || y > yMax + 10) {
        if (currentPath) {
          paths.push(currentPath)
          currentPath = ''
        }
        continue
      }

      const px = padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding)
      const py = height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding)

      if (!currentPath) {
        currentPath = `M ${px.toFixed(1)} ${py.toFixed(1)}`
      } else {
        currentPath += ` L ${px.toFixed(1)} ${py.toFixed(1)}`
      }
    }

    if (currentPath) {
      paths.push(currentPath)
    }

    return paths
  }, [evaluate, xMin, xMax, yMin, yMax, width, height, padding])

  // Generate grid tick values
  const xTicks = useMemo(() => {
    const ticks: number[] = []
    for (let i = Math.ceil(xMin); i <= Math.floor(xMax); i++) {
      if (i !== 0) ticks.push(i)
    }
    return ticks
  }, [xMin, xMax])

  const yTicks = useMemo(() => {
    const ticks: number[] = []
    for (let i = Math.ceil(yMin); i <= Math.floor(yMax); i++) {
      if (i !== 0) ticks.push(i)
    }
    return ticks
  }, [yMin, yMax])

  const originX = toSvgX(0)
  const originY = toSvgY(0)

  const handleAskAI = () => {
    if (onAskAI) {
      const keyPointsStr = keyPoints.map((p) => `${p.label}(${p.x}; ${p.y})`).join(', ')
      const summary = `Đồ thị hàm số ${functionFormula}: Loại hàm ${functionType}. Các điểm đặc biệt: ${keyPointsStr}.`
      onAskAI(title, summary)
    }
  }

  return (
    <div className="function-graph-card" id={id} tabIndex={0}>
      <div className="function-graph-header">
        <div className="function-graph-title-group">
          <LineChart size={16} className="function-graph-icon" aria-hidden />
          <div className="function-graph-title-wrap">
            <span className="function-graph-badge">ĐỒ THỊ HÌNH HỌC TOÁN HỌC</span>
            <h4 className="function-graph-title">{title}</h4>
            <div className="function-graph-formula">
              <MathView math={functionFormula} inline />
            </div>
          </div>
        </div>

        {onAskAI && (
          <button
            type="button"
            className="function-graph-ai-btn"
            onClick={handleAskAI}
            aria-label={`Hỏi AI về đồ thị ${title}`}
            title="Hỏi AI Tutor phân tích hình dáng và các điểm đặc biệt của đồ thị"
          >
            <Sparkles size={13} aria-hidden />
            <span>Phân tích đồ thị</span>
          </button>
        )}
      </div>

      <div className="function-graph-svg-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="function-graph-svg"
          role="img"
          aria-label={`Đồ thị hàm số ${functionFormula}`}
        >
          {/* Subtle Grid Lines */}
          <g className="graph-grid-lines" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2">
            {xTicks.map((tick) => (
              <line key={`gx-${tick}`} x1={toSvgX(tick)} y1={padding} x2={toSvgX(tick)} y2={height - padding} />
            ))}
            {yTicks.map((tick) => (
              <line key={`gy-${tick}`} x1={padding} y1={toSvgY(tick)} x2={width - padding} y2={toSvgY(tick)} />
            ))}
          </g>

          {/* Coordinate Axes */}
          <g className="graph-axes" stroke="#102a43" strokeWidth="1.5">
            {/* Ox Axis */}
            <line x1={padding - 10} y1={originY} x2={width - padding + 15} y2={originY} />
            {/* Arrow on Ox */}
            <polygon
              points={`${width - padding + 15},${originY} ${width - padding + 5},${originY - 4} ${width - padding + 5},${originY + 4}`}
              fill="#102a43"
            />
            {/* Oy Axis */}
            <line x1={originX} y1={height - padding + 10} x2={originX} y2={padding - 15} />
            {/* Arrow on Oy */}
            <polygon
              points={`${originX},${padding - 15} ${originX - 4},${padding - 5} ${originX + 4},${padding - 5}`}
              fill="#102a43"
            />
          </g>

          {/* Axis Labels */}
          <text x={width - padding + 18} y={originY + 4} className="axis-label" fill="#102a43" fontSize="12" fontWeight="700">
            x
          </text>
          <text x={originX + 8} y={padding - 12} className="axis-label" fill="#102a43" fontSize="12" fontWeight="700">
            y
          </text>
          <text x={originX - 12} y={originY + 14} className="axis-origin" fill="#475569" fontSize="11" fontWeight="600">
            O
          </text>

          {/* Ticks and values on axes */}
          <g className="graph-ticks" fill="#64748b" fontSize="10" textAnchor="middle">
            {xTicks.map((tick) => (
              <text key={`tx-${tick}`} x={toSvgX(tick)} y={originY + 14}>
                {tick}
              </text>
            ))}
            {yTicks.map((tick) => (
              <text key={`ty-${tick}`} x={originX - 12} y={toSvgY(tick) + 3} textAnchor="end">
                {tick}
              </text>
            ))}
          </g>

          {/* Asymptote Lines */}
          {asymptotes.map((asym, i) => {
            if (asym.type === 'vertical') {
              const xPos = toSvgX(asym.value)
              return (
                <g key={`asym-v-${i}`}>
                  <line
                    x1={xPos}
                    y1={padding}
                    x2={xPos}
                    y2={height - padding}
                    stroke="#dc2626"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  <text x={xPos + 4} y={padding + 16} fill="#dc2626" fontSize="10" fontWeight="700">
                    {asym.label}
                  </text>
                </g>
              )
            }
            if (asym.type === 'horizontal') {
              const yPos = toSvgY(asym.value)
              return (
                <g key={`asym-h-${i}`}>
                  <line
                    x1={padding}
                    y1={yPos}
                    x2={width - padding}
                    y2={yPos}
                    stroke="#dc2626"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  <text x={width - padding - 40} y={yPos - 5} fill="#dc2626" fontSize="10" fontWeight="700">
                    {asym.label}
                  </text>
                </g>
              )
            }
            return null
          })}

          {/* Mathematical Curve Paths */}
          {curvePaths.map((d, i) => (
            <path
              key={`curve-${i}`}
              d={d}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Key Points (Extrema, Inflection, Intercepts) */}
          {keyPoints.map((point, idx) => {
            const px = toSvgX(point.x)
            const py = toSvgY(point.y)
            const isExtremum = point.type === 'max' || point.type === 'min'
            const fillColor = isExtremum ? '#d97706' : point.type === 'inflection' ? '#8b5cf6' : '#102a43'

            return (
              <g key={`kp-${idx}`} className="key-point-group">
                {/* Horizontal & vertical dashed reference lines to axes */}
                <line x1={px} y1={py} x2={px} y2={originY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                <line x1={px} y1={py} x2={originX} y2={py} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />

                <circle cx={px} cy={py} r="4.5" fill={fillColor} stroke="#ffffff" strokeWidth="1.5" />
                <text
                  x={px + (point.x >= 0 ? 8 : -8)}
                  y={py + (point.y >= 0 ? -8 : 14)}
                  fill={fillColor}
                  fontSize="11"
                  fontWeight="700"
                  textAnchor={point.x >= 0 ? 'start' : 'end'}
                >
                  {point.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend & Footnote */}
      <div className="function-graph-footer">
        <div className="graph-legend">
          <span className="legend-item">
            <span className="legend-indicator curve" />
            <span>Đồ thị hàm số (C)</span>
          </span>
          {asymptotes.length > 0 && (
            <span className="legend-item">
              <span className="legend-indicator asymptote" />
              <span>Đường tiệm cận</span>
            </span>
          )}
          {keyPoints.some((p) => p.type === 'max' || p.type === 'min') && (
            <span className="legend-item">
              <span className="legend-indicator extremum" />
              <span>Điểm cực trị</span>
            </span>
          )}
          {keyPoints.some((p) => p.type === 'inflection') && (
            <span className="legend-item">
              <span className="legend-indicator inflection" />
              <span>Tâm đối xứng (Điểm uốn)</span>
            </span>
          )}
        </div>

        {note && <p className="graph-note">{note}</p>}
      </div>
    </div>
  )
}

