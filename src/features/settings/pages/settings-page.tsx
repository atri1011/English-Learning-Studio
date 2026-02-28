import { useEffect, useState, useRef } from "react"
import { Plus, Trash2, Check, Loader2, ArrowLeft, Download, Upload } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useSettingsStore } from "@/stores/settings-store"
import { testConnection } from "@/lib/api/openai-compatible-client"
import { exportBackup, downloadBackup, importBackup } from "@/lib/db/backup"
import { toast } from "sonner"

export function SettingsPage() {
  const {
    profiles,
    activeProfileId,
    loadProfiles,
    addProfile,
    deleteProfile,
    setActiveProfile,
  } = useSettingsStore()

  const [showForm, setShowForm] = useState(false)
  const [testing, setTesting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: "",
    baseURL: "",
    apiKey: "",
    model: "",
    temperature: 0.3,
    maxTokens: 2000,
  })

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  const handleAdd = async () => {
    if (!form.name || !form.baseURL || !form.apiKey || !form.model) {
      toast.error("请填写所有必填项")
      return
    }
    await addProfile(form)
    setForm({ name: "", baseURL: "", apiKey: "", model: "", temperature: 0.3, maxTokens: 2000 })
    setShowForm(false)
    toast.success("已添加 API 配置")
  }

  const handleTest = async (baseURL: string, apiKey: string, model: string) => {
    setTesting(true)
    const result = await testConnection(baseURL, apiKey, model)
    setTesting(false)
    if (result.success) {
      toast.success("连接成功")
    } else {
      toast.error(result.error || "连接失败")
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/articles" className="md:hidden">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">设置</h2>
          <p className="text-sm text-muted-foreground mt-1">
            配置 OpenAI 兼容的 API 接口
          </p>
        </div>
      </div>

      {/* Existing Profiles */}
      <div className="space-y-3 mb-6">
        {profiles.map((profile) => (
          <Card key={profile.id} className={profile.id === activeProfileId ? "border-primary/50" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{profile.name}</CardTitle>
                  {profile.id === activeProfileId && (
                    <Badge variant="default" className="text-xs">使用中</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {profile.id !== activeProfileId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveProfile(profile.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      启用
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      deleteProfile(profile.id)
                      toast.success("已删除")
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs">
                {profile.baseURL} / {profile.model}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Temperature: {profile.temperature}</span>
                <span>Max Tokens: {profile.maxTokens}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto text-xs h-7"
                  disabled={testing}
                  onClick={() => handleTest(profile.baseURL, profile.apiKey, profile.model)}
                >
                  {testing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  测试连接
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profiles.length === 0 && !showForm && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              尚未配置 API。添加一个即可开始使用 AI 分析。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Profile Form */}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">添加 API 配置</CardTitle>
            <CardDescription>
              配置一个 OpenAI 兼容的 API 端点
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>配置名称 *</Label>
              <Input
                placeholder="如 OpenAI、DeepSeek、本地模型"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>API 地址 *</Label>
              <Input
                placeholder="https://api.openai.com"
                value={form.baseURL}
                onChange={(e) => setForm({ ...form, baseURL: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                填写基础地址，无需包含 /v1/chat/completions
              </p>
            </div>
            <div className="space-y-2">
              <Label>API Key *</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>模型 *</Label>
              <Input
                placeholder="如 gpt-4o、deepseek-chat"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Temperature</Label>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) =>
                    setForm({ ...form, temperature: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>最大 Tokens</Label>
                <Input
                  type="number"
                  min={100}
                  max={16000}
                  step={100}
                  value={form.maxTokens}
                  onChange={(e) =>
                    setForm({ ...form, maxTokens: parseInt(e.target.value) || 2000 })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                取消
              </Button>
              <Button onClick={handleAdd}>添加</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          添加 API 配置
        </Button>
      )}

      {/* Data Management */}
      <Separator className="my-8" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">数据管理</CardTitle>
          <CardDescription>
            导出或恢复文章、分析结果和 API 配置
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2"
            disabled={exporting}
            onClick={async () => {
              setExporting(true)
              try {
                const json = await exportBackup()
                downloadBackup(json)
                toast.success("备份已导出")
              } catch {
                toast.error("导出失败")
              }
              setExporting(false)
            }}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            导出备份
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => importRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            恢复备份
          </Button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const result = await importBackup(file)
                await loadProfiles()
                toast.success(`已恢复 ${result.articles} 篇文章、${result.sentences} 个句子`)
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "恢复失败")
              }
              if (importRef.current) importRef.current.value = ""
            }}
          />
          <p className="w-full text-xs text-muted-foreground mt-1">
            备份包含 API Key，请妥善保管导出文件。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
