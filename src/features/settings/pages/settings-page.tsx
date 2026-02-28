import { useEffect, useState } from "react"
import { Plus, Trash2, Check, Loader2, ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useSettingsStore } from "@/stores/settings-store"
import { testConnection } from "@/lib/api/openai-compatible-client"
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
      toast.error("Please fill all required fields")
      return
    }
    await addProfile(form)
    setForm({ name: "", baseURL: "", apiKey: "", model: "", temperature: 0.3, maxTokens: 2000 })
    setShowForm(false)
    toast.success("API profile added")
  }

  const handleTest = async (baseURL: string, apiKey: string, model: string) => {
    setTesting(true)
    const result = await testConnection(baseURL, apiKey, model)
    setTesting(false)
    if (result.success) {
      toast.success("Connection successful")
    } else {
      toast.error(result.error || "Connection failed")
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
          <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your OpenAI-compatible API profiles
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
                    <Badge variant="default" className="text-xs">Active</Badge>
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
                      Set Active
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      deleteProfile(profile.id)
                      toast.success("Profile deleted")
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
                  Test Connection
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
              No API profiles configured. Add one to start using AI analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Profile Form */}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add API Profile</CardTitle>
            <CardDescription>
              Configure an OpenAI-compatible API endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Name *</Label>
              <Input
                placeholder="e.g. OpenAI, DeepSeek, Local LLM"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>API Base URL *</Label>
              <Input
                placeholder="https://api.openai.com"
                value={form.baseURL}
                onChange={(e) => setForm({ ...form, baseURL: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The base URL without /v1/chat/completions
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
              <Label>Model *</Label>
              <Input
                placeholder="e.g. gpt-4o, deepseek-chat"
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
                <Label>Max Tokens</Label>
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
                Cancel
              </Button>
              <Button onClick={handleAdd}>Add Profile</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add API Profile
        </Button>
      )}
    </div>
  )
}
