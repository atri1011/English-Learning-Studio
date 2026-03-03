import { useState } from "react"
import { Loader2, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/stores/auth-store"
import { toast } from "sonner"

export function RegisterForm() {
  const { signUp, loading } = useAuthStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("请填写邮箱和密码")
      return
    }
    if (password !== confirmPassword) {
      toast.error("两次密码输入不一致")
      return
    }
    if (password.length < 6) {
      toast.error("密码至少 6 个字符")
      return
    }
    const { error, needsConfirmation } = await signUp(email, password)
    if (error) {
      toast.error(error)
    } else if (needsConfirmation) {
      setSent(true)
      toast.success("确认邮件已发送，请查收邮箱")
    } else {
      toast.success("注册成功")
    }
  }

  if (sent) {
    return (
      <div className="text-center py-6 space-y-3">
        <Mail className="h-10 w-10 mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">
          确认邮件已发送至 <strong>{email}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          请查收邮箱并点击确认链接完成注册
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-email">邮箱</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password">密码</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-password"
            type="password"
            placeholder="至少 6 个字符"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            autoComplete="new-password"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-confirm">确认密码</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-confirm"
            type="password"
            placeholder="再次输入密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-9"
            autoComplete="new-password"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        注册
      </Button>
    </form>
  )
}
