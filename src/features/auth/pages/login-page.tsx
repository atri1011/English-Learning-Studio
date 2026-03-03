import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "../components/login-form"
import { RegisterForm } from "../components/register-form"
import { BookOpen } from "lucide-react"

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">English Studio</h1>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">账户</CardTitle>
            <CardDescription>
              登录后可跨设备同步学习数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">
          未登录也可正常使用，数据仅保存在本地
        </p>
      </div>
    </div>
  )
}
