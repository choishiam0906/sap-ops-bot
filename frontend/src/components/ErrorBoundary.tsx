import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '18px', color: '#334e68', marginBottom: '8px' }}>
            문제가 발생했어요
          </h2>
          <p style={{ fontSize: '14px', color: '#829ab1', marginBottom: '20px' }}>
            {this.state.message || '예상치 못한 오류가 발생했어요'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 20px',
              background: '#006edc',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            다시 시도하기
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
