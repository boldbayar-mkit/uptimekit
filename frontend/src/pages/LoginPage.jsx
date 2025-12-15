// LoginPage.jsx
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card.jsx";
import { Label } from "../components/ui/label.jsx";
import { Input } from "../components/ui/input.jsx";
import { Button } from "../components/ui/button.jsx";
import { User, Lock, Activity } from "lucide-react";
import SignupDialog from "../components/SignupDialog.jsx";
import { useUserInfo } from "../providers/userInfoProviders.jsx";
import { toast } from "react-toastify";

const LoginPage = () => {
  const queryClient = useQueryClient();
  const { userInfo } = useUserInfo();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      loginId: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data) => axios.post("/api/login", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "profileInfo"] });
    },
    onError: (error) => {
      const message = error.response?.data?.error || "Login failed";
      toast.error(message);
    },
  });

  const onSubmit = (data) => {
    loginMutation.mutate(data);
  };

  useEffect(() => {
    if (userInfo) {
      navigate("/dashboard");
    }
  }, [userInfo]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-12 pb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
            <Activity className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-center mb-3">
            Login to UptimeKit
          </h2>
          <p className="text-muted-foreground mb-6 text-center">
            Enter your credentials to access your monitors
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 px-6 py-6"
          >
            <div className="space-y-3">
              <Label
                htmlFor="loginId"
                className="flex items-center gap-2 font-semibold"
              >
                <User className="h-4 w-4 text-primary" />
                Login ID
              </Label>
              <Input
                id="loginId"
                placeholder="Login ID"
                className="h-11 border-2 border-muted hover:border-primary transition-colors"
                {...register("loginId", {
                  required: "Please give your Login ID",
                  minLength: {
                    value: 2,
                    message: "Login ID should be at least 2 characters",
                  },
                })}
              />
              {errors.loginId && (
                <p className="text-sm text-destructive font-medium">
                  ⚠ {errors.loginId.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="password"
                className="flex items-center gap-2 font-semibold"
              >
                <Lock className="h-4 w-4 text-primary" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                className="h-11 border-2 border-muted hover:border-primary transition-colors font-mono text-sm"
                {...register("password", {
                  required: "Please enter the password",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                  pattern: {
                    value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
                    message: "Password must contain letters and numbers",
                  },
                })}
              />
              {errors.password && (
                <p className="text-sm text-destructive font-medium">
                  ⚠ {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Button
                type="submit"
                className="w-full h-10 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all font-semibold text-primary-foreground rounded-lg"
              >
                {loginMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                    Logging...
                  </>
                ) : (
                  <>Login</>
                )}
              </Button>
            </div>
          </form>
          <div className="px-6 text-center">
            <SignupDialog fullWidth />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
