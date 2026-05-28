import { login } from './actions'

// Allow reading URL search params for error messages
export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams
  const error = searchParams?.error

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] p-4 font-sans">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border-t-4 border-t-[#aa1e2d]">
        
        {/* MFU Branding Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#aa1e2d] rounded-full flex items-center justify-center border-2 border-[#d4af37]">
              <span className="text-[#d4af37] font-bold text-xl">MFU</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#aa1e2d] tracking-wide uppercase">
            Mae Fah Luang
          </h1>
          <h2 className="text-lg font-semibold text-gray-700">
            School of Nursing
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Clinical Scenario Assessment System
          </p>
        </div>
        
        {/* Login Form */}
        <form className="space-y-6 mt-8" action={login}>
          
          {/* Display Error Message if login fails */}
          {error && (
            <div className="p-3 text-sm text-[#aa1e2d] bg-red-50 border border-red-200 rounded-md text-center font-medium">
              {error === 'Invalid Credentials' 
                ? 'Incorrect Student ID or Password.' 
                : 'Login failed. Please try again.'}
            </div>
          )}

          <div>
            <label htmlFor="studentId" className="block text-sm font-semibold text-gray-700">
              Student ID
            </label>
            <div className="mt-2">
              <input
                id="studentId"
                name="studentId"
                type="text"
                required
                placeholder="Enter your 10-digit ID (e.g., 6631501189)"
                className="block w-full rounded-md border border-gray-300 py-3 px-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#aa1e2d] focus:outline-none focus:ring-1 focus:ring-[#aa1e2d] sm:text-sm transition-all"
              />
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className="block w-full rounded-md border border-gray-300 py-3 px-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#aa1e2d] focus:outline-none focus:ring-1 focus:ring-[#aa1e2d] sm:text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-[#aa1e2d] px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-[#8a1824] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aa1e2d] transition-colors border border-transparent hover:border-[#d4af37]"
            >
              Sign In
            </button>
          </div>
        </form>

        {/* Footer Text */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Mae Fah Luang University. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}