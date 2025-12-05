import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { userQuery } from "../entities/user/user.query";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Zap, X, User, Lock, Mail, Type } from "lucide-react";

const SignupDialog = ({ fullWidth }) => {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      loginId: "",
      email: "",
      password: "",
    },
  });

  const queryClient = useQueryClient();

  const signupMutation = useMutation({
    mutationFn: (data) => axios.post("/api/signup", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userQuery.all().concat(["profileInfo"]),
      });
      setOpen(false);
      reset();
    },
    onError: (error) => {
      console.error("Error during signup:", error);
    },
  });

  const onSubmit = (data) => {
    signupMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={fullWidth ? "w-full" : "md:w-auto w-auto"}>
          <Button
            variant="outline"
            // className="md:size-auto md:gap-2 md:px-6 md:py-2 md:h-10 h-10 w-10 md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all flex md:flex items-center justify-center"
            className={`${
              fullWidth ? "w-full" : "px-6"
            } h-10 border-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-muted-foreground/50 transition-all rounded-lg`}
          >
            <span className="font-semibold hidden md:inline ml-2">Signup</span>
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden">
        <div className="bg-primary px-6 py-4">
          <DialogHeader className="border-0">
            <DialogTitle className="text-2xl text-primary-foreground flex items-center gap-2">
              <Zap className="h-6 w-6" />
              Signup
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 mt-1">
              Start signuping process here.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-6">
          <div className="space-y-3">
            <Label
              htmlFor="name"
              className="flex items-center gap-2 font-semibold"
            >
              <Type className="h-4 w-4 text-primary" />
              Name
            </Label>
            <Input
              id="name"
              placeholder="Name"
              className="h-11 border-2 border-muted hover:border-primary transition-colors"
              {...register("name", {
                required: "Please give your name",
                minLength: {
                  value: 2,
                  message: "Name should be at least 2 characters",
                },
              })}
            />
            {errors.name && (
              <p className="text-sm text-destructive font-medium">
                ⚠ {errors.name.message}
              </p>
            )}
          </div>
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
                  value: 8, // жишээ нь 8 тэмдэгтээс дээш байх ёстой
                  message: "Password must be at least 8 characters",
                },
                pattern: {
                  value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, // латин үсэг болон тоо агуулсан
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
          <div className="space-y-3">
            <Label
              htmlFor="password"
              className="flex items-center gap-2 font-semibold"
            >
              <Mail className="h-4 w-4 text-primary" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              className="h-11 border-2 border-muted hover:border-primary transition-colors font-mono text-sm"
              {...register("email", {
                required: "Please enter the email",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Please enter a valid email address",
                },
              })}
            />
            {errors.email && (
              <p className="text-sm text-destructive font-medium">
                ⚠ {errors.email.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="px-6 h-10 border-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-muted-foreground/50 transition-all rounded-lg"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={signupMutation.isPending}
              className="px-8 h-10 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all font-semibold text-primary-foreground rounded-lg"
            >
              {signupMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                  Adding...
                </>
              ) : (
                <>Register</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SignupDialog;
