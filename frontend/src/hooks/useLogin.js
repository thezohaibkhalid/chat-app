import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login as apiLogin, verifyOtp as apiVerifyOtp, resendOtp as apiResendOtp } from "../lib/api";

const useLogin = () => {
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: apiLogin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  });

  const verifyOtp = useMutation({
    mutationFn: apiVerifyOtp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  });

  const resendOtp = useMutation({
    mutationFn: apiResendOtp,
  });

  return {
    login,                 
    verifyOtp,             
    resendOtp,             

    isPending: login.isPending,
    error: login.isError ? login.error : null,
    loginMutation: login.mutate,
    verifyOtpMutation: verifyOtp.mutate,
    resendOtpMutation: resendOtp.mutate,
  };
};

export default useLogin;
