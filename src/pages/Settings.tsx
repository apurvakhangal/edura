import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, User, Bell, Shield, Palette } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { SUPPORTED_LANGUAGES } from '@/services/translateService';
import { TranslatedText } from '@/components/TranslatedText';
import { useState, useEffect } from 'react';

export default function Settings() {
  const { mode, setMode, isDyslexia, toggleDyslexia, isColorblind, toggleColorblind, language, setLanguage, fontSize, setFontSize } =
    useThemeStore();
  const user = useUserStore((state) => state.user);

  const handleFontSizeChange = (value: string) => {
    setFontSize(value);
    document.documentElement.style.fontSize =
      value === 'small' ? '12px' :
      value === 'medium' ? '16px' :
      value === 'large' ? '20px' :
      '24px'; // xlarge
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold"><TranslatedText text="Settings" /></h1>
        </div>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile"><TranslatedText text="Profile" /></TabsTrigger>
          <TabsTrigger value="accessibility"><TranslatedText text="Accessibility" /></TabsTrigger>
          <TabsTrigger value="notifications"><TranslatedText text="Notifications" /></TabsTrigger>
          <TabsTrigger value="privacy"><TranslatedText text="Privacy" /></TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle><TranslatedText text="Profile Settings" /></CardTitle>
              <CardDescription><TranslatedText text="Manage your account information" /></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name"><TranslatedText text="Full Name" /></Label>
                <Input id="name" defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email"><TranslatedText text="Email" /></Label>
                <Input id="email" type="email" defaultValue={user?.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language"><TranslatedText text="Preferred Language" /></Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button><TranslatedText text="Save Changes" /></Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility Settings */}
        <TabsContent value="accessibility">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle><TranslatedText text="Theme Settings" /></CardTitle>
                <CardDescription><TranslatedText text="Customize your visual experience" /></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium"><TranslatedText text="Theme Mode" /></p>
                    <p className="text-sm text-muted-foreground">
                      <TranslatedText text="Choose your preferred theme" />
                    </p>
                  </div>
                  <Select value={mode} onValueChange={(value: any) => setMode(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light"><TranslatedText text="Light" /></SelectItem>
                      <SelectItem value="dark"><TranslatedText text="Dark" /></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle><TranslatedText text="Accessibility Features" /></CardTitle>
                <CardDescription><TranslatedText text="Enable features to enhance your experience" /></CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium"><TranslatedText text="Dyslexia-Friendly Mode" /></p>
                    <p className="text-sm text-muted-foreground">
                      <TranslatedText text="Uses OpenDyslexic font and increased spacing" />
                    </p>
                  </div>
                  <Switch checked={isDyslexia} onCheckedChange={toggleDyslexia} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium"><TranslatedText text="Colorblind-Friendly Mode" /></p>
                    <p className="text-sm text-muted-foreground">
                      <TranslatedText text="Uses high-contrast, accessible color palette" />
                    </p>
                  </div>
                  <Switch checked={isColorblind} onCheckedChange={toggleColorblind} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium"><TranslatedText text="Screen Reader Support" /></p>
                    <p className="text-sm text-muted-foreground">
                      <TranslatedText text="Enhanced ARIA labels and descriptions" />
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium"><TranslatedText text="Reduce Motion" /></p>
                    <p className="text-sm text-muted-foreground">
                      <TranslatedText text="Minimize animations and transitions" />
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle><TranslatedText text="Font Size" /></CardTitle>
                <CardDescription><TranslatedText text="Adjust text size for better readability" /></CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={fontSize} onValueChange={handleFontSizeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small"><TranslatedText text="Small" /></SelectItem>
                    <SelectItem value="medium"><TranslatedText text="Medium" /></SelectItem>
                    <SelectItem value="large"><TranslatedText text="Large" /></SelectItem>
                    <SelectItem value="xlarge"><TranslatedText text="Extra Large" /></SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle><TranslatedText text="Notification Preferences" /></CardTitle>
              <CardDescription><TranslatedText text="Choose what updates you want to receive" /></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium"><TranslatedText text="Study Reminders" /></p>
                  <p className="text-sm text-muted-foreground">
                    <TranslatedText text="Get reminded about your study schedule" />
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium"><TranslatedText text="Achievement Notifications" /></p>
                  <p className="text-sm text-muted-foreground">
                    <TranslatedText text="Be notified when you earn XP or badges" />
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium"><TranslatedText text="Community Updates" /></p>
                  <p className="text-sm text-muted-foreground">
                    <TranslatedText text="New forum replies and group activities" />
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium"><TranslatedText text="Weekly Progress Report" /></p>
                  <p className="text-sm text-muted-foreground">
                    <TranslatedText text="Summary of your learning progress" />
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle><TranslatedText text="Privacy & Security" /></CardTitle>
              <CardDescription><TranslatedText text="Manage your data and security settings" /></CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium"><TranslatedText text="Profile Visibility" /></p>
                  <p className="text-sm text-muted-foreground">
                    <TranslatedText text="Control who can see your profile" />
                  </p>
                </div>
                <Select defaultValue="friends">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public"><TranslatedText text="Public" /></SelectItem>
                    <SelectItem value="friends"><TranslatedText text="Friends" /></SelectItem>
                    <SelectItem value="private"><TranslatedText text="Private" /></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium"><TranslatedText text="Show on Leaderboard" /></p>
                  <p className="text-sm text-muted-foreground">
                    <TranslatedText text="Display your ranking publicly" />
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium"><TranslatedText text="Analytics Data" /></p>
                  <p className="text-sm text-muted-foreground">
                    <TranslatedText text="Allow collection of learning data" />
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="pt-4">
                <Button variant="destructive"><TranslatedText text="Delete Account" /></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
