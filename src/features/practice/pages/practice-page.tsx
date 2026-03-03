import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Languages, Plus, ArrowLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePracticeStore } from "@/stores/practice-store"
import { useSettingsStore } from "@/stores/settings-store"
import { MaterialCard } from "../components/material-card"
import { MaterialCreateDialog } from "../components/material-create-dialog"
import { PracticeSession } from "../components/practice-session"
import { EvaluationResult } from "../components/evaluation-result"
import type { PracticeAttempt } from "@/types/db"

type View = "list" | "practice" | "result" | "history"

export function PracticePage() {
  const {
    materials,
    selectedMaterialId,
    attempts,
    evaluating,
    evaluationProgress,
    error,
    loadMaterials,
    addMaterial,
    removeMaterial,
    selectMaterial,
    loadAttempts,
    submitBackTranslation,
    clearError,
  } = usePracticeStore()

  const { profiles, loadProfiles } = useSettingsStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [view, setView] = useState<View>("list")
  const [viewingAttempt, setViewingAttempt] = useState<PracticeAttempt | null>(null)

  useEffect(() => {
    loadMaterials()
    loadProfiles()
  }, [loadMaterials, loadProfiles])

  const hasApiProfile = profiles.length > 0
  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId)
  const materialAttempts = selectedMaterialId ? attempts[selectedMaterialId] ?? [] : []

  const handlePractice = (materialId: string) => {
    selectMaterial(materialId)
    setView("practice")
    setViewingAttempt(null)
  }

  const handleViewHistory = (materialId: string) => {
    selectMaterial(materialId)
    loadAttempts(materialId)
    setView("history")
  }

  const handleSubmit = async (userTranslation: string) => {
    const attempt = await submitBackTranslation(userTranslation)
    if (attempt) {
      setViewingAttempt(attempt)
      setView("result")
    }
  }

  const handleBack = () => {
    setView("list")
    selectMaterial(null)
    setViewingAttempt(null)
    clearError()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      {view === "list" ? (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">回译练习</h2>
            <p className="text-sm text-muted-foreground mt-1">
              阅读中文翻译，用英文写出原文，AI 评估翻译质量
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            新建素材
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{selectedMaterial?.title}</h2>
            <p className="text-xs text-muted-foreground">
              {view === "practice" && "回译练习"}
              {view === "result" && "评估结果"}
              {view === "history" && "练习历史"}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 mb-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={clearError}>
            关闭
          </Button>
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <>
          {materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Languages className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">还没有练习素材</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                粘贴一篇双语文章开始回译练习，AI 将评估你的翻译质量。
              </p>
              {!hasApiProfile && (
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 mb-4 max-w-sm">
                  <p className="text-sm font-medium mb-2">需要先完成配置</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    请先配置 AI API，才能使用回译评估功能。
                  </p>
                  <Link to="/settings">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings className="h-3.5 w-3.5" />
                      前往设置
                    </Button>
                  </Link>
                </div>
              )}
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                创建第一个素材
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  onPractice={() => handlePractice(material.id)}
                  onViewHistory={() => handleViewHistory(material.id)}
                  onDelete={() => removeMaterial(material.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Practice View */}
      {view === "practice" && selectedMaterial && (
        <PracticeSession
          material={selectedMaterial}
          onSubmit={handleSubmit}
          evaluating={evaluating}
          progress={evaluationProgress}
        />
      )}

      {/* Result View */}
      {view === "result" && viewingAttempt && (
        <div className="space-y-4">
          <EvaluationResult attempt={viewingAttempt} sourceText={selectedMaterial?.sourceText} />
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={handleBack}>
              返回列表
            </Button>
            <Button onClick={() => setView("practice")}>
              再练一次
            </Button>
          </div>
        </div>
      )}

      {/* History View */}
      {view === "history" && (
        <div className="space-y-4">
          {materialAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无练习记录</p>
          ) : (
            materialAttempts.map((attempt) => (
              <div key={attempt.id} className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{new Date(attempt.createdAt).toLocaleString("zh-CN")}</span>
                  <span className="font-medium text-foreground">{attempt.overallScore} 分</span>
                  {attempt.isBest && (
                    <span className="text-xs text-primary font-medium">最佳</span>
                  )}
                </div>
                <EvaluationResult attempt={attempt} sourceText={selectedMaterial?.sourceText} />
              </div>
            ))
          )}
        </div>
      )}

      <MaterialCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={addMaterial}
      />
    </div>
  )
}
