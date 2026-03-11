# IPC Protocol — 채널 레퍼런스

## 개요

모든 Renderer ↔ Main 통신은 Preload의 `contextBridge`를 통해 `window.sapOpsDesktop` API로 노출됩니다. 내부적으로 `ipcRenderer.invoke` → `ipcMain.handle` 패턴을 사용합니다.

---

## 채널 목록

### Auth (`auth:*`)
| 채널 | 설명 |
|------|------|
| `auth:setApiKey` | API 키 설정 |
| `auth:status` | 인증 상태 조회 |
| `auth:logout` | 로그아웃 |
| `auth:oauthAvailability` | OAuth 가용성 확인 |
| `auth:initiateOAuth` | OAuth 시작 |
| `auth:waitOAuthCallback` | OAuth 콜백 대기 |
| `auth:submitOAuthCode` | OAuth 코드 제출 |
| `auth:initiateDeviceCode` | GitHub Device Code 시작 |
| `auth:pollDeviceCode` | Device Code 폴링 |

### Chat (`chat:*`)
| 채널 | 설명 |
|------|------|
| `chat:send` | 메시지 전송 |
| `chat:stop` | 생성 중단 |

### Skills (`skills:*`)
| 채널 | 설명 |
|------|------|
| `skills:list` | 스킬 목록 (프리셋 + 커스텀) |
| `skills:listPacks` | 스킬 팩 목록 |
| `skills:recommend` | 컨텍스트 기반 스킬 추천 |
| `skills:listCustom` | 커스텀 스킬 목록 |
| `skills:saveCustom` | 커스텀 스킬 저장 |
| `skills:deleteCustom` | 커스텀 스킬 삭제 |
| `skills:openFolder` | 스킬 폴더 열기 |

### Sources (`sources:*`)
| 채널 | 설명 |
|------|------|
| `sources:list` | 소스 목록 |
| `sources:search` | 소스 검색 |
| `sources:listConfigured` | 설정된 소스 목록 |
| `sources:pickAndAddLocalFolder` | 로컬 폴더 추가 |
| `sources:reindex` | 소스 재인덱싱 |
| `sources:searchDocuments` | 문서 검색 |
| `sources:getDocument` | 문서 상세 조회 |

### Agents (`agents:*`)
| 채널 | 설명 |
|------|------|
| `agents:list` | 에이전트 목록 (프리셋 + 커스텀) |
| `agents:get` | 에이전트 상세 |
| `agents:execute` | 에이전트 실행 |
| `agents:execution:status` | 실행 상태 조회 |
| `agents:executions:list` | 실행 이력 목록 |
| `agents:execution:cancel` | 실행 취소 |
| `agents:listCustom` | 커스텀 에이전트 목록 |
| `agents:saveCustom` | 커스텀 에이전트 저장 |
| `agents:deleteCustom` | 커스텀 에이전트 삭제 |
| `agents:openFolder` | 에이전트 폴더 열기 |

### CBO (`cbo:*`)
| 채널 | 설명 |
|------|------|
| `cbo:analyzeText` | 텍스트 분석 |
| `cbo:analyzeFile` | 파일 분석 |
| `cbo:analyzeFolder` | 폴더 분석 |
| `cbo:pickAndAnalyzeFile` | 파일 선택 + 분석 |
| `cbo:pickAndAnalyzeFolder` | 폴더 선택 + 분석 |
| `cbo:runs:list` | 분석 이력 |
| `cbo:runs:detail` | 분석 상세 |
| `cbo:runs:syncKnowledge` | Knowledge 동기화 |
| `cbo:runs:diff` | 분석 비교 |
| `cbo:cancelFolder` | 폴더 분석 취소 |
| `cbo:progress` | 진행 이벤트 (on) |

### MCP (`mcp:*`)
| 채널 | 설명 |
|------|------|
| `mcp:connect` | MCP 서버 연결 |
| `mcp:disconnect` | 연결 해제 |
| `mcp:listServers` | 서버 목록 |
| `mcp:listResources` | 리소스 목록 |
| `mcp:addSource` | MCP 소스 추가 |
| `mcp:syncSource` | 소스 동기화 |

### Archive (`archive:*`)
| 채널 | 설명 |
|------|------|
| `archive:pickFolder` | 폴더 선택 |
| `archive:listContents` | 파일 트리 조회 |
| `archive:readFile` | 파일 읽기 |
| `archive:saveFile` | 파일 저장 |

### Sessions (`sessions:*`)
| 채널 | 설명 |
|------|------|
| `sessions:list` | 세션 목록 |
| `sessions:messages` | 세션 메시지 |
| `sessions:listFiltered` | 필터링 목록 |
| `sessions:updateTodoState` | Todo 상태 변경 |
| `sessions:toggleFlag` | 플래그 토글 |
| `sessions:toggleArchive` | 아카이브 토글 |
| `sessions:addLabel` | 레이블 추가 |
| `sessions:removeLabel` | 레이블 제거 |
| `sessions:stats` | 세션 통계 |

### Cockpit (`cockpit:*`)
| 채널 | 설명 |
|------|------|
| `cockpit:plans:*` | 마감 플랜 CRUD |
| `cockpit:steps:*` | 마감 스텝 CRUD |
| `cockpit:stats` | 마감 통계 |

### Routine (`routine:*`)
| 채널 | 설명 |
|------|------|
| `routine:templates:*` | 루틴 템플릿 CRUD |
| `routine:execute:now` | 즉시 실행 |
| `routine:executions:*` | 실행 이력 |
