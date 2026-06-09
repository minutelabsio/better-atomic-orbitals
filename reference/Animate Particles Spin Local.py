import bpy
import os
import numpy as np
import mathutils
from math import sqrt
from mathutils import Vector
from mathutils import Matrix
from scipy.special import eval_genlaguerre
from scipy.special import lpmv



degp = bpy.context.evaluated_depsgraph_get()

#object = bpy.data.objects["2 1 -1 points"]
#print(" *** START HERE *** ")
#mat = Matrix.Rotation(1,4,"Z")
#particle_systems = object.evaluated_get(degp).particle_systems
#print(mat@particle_systems[0].particles[0].location)
#print(particle_systems[0].particles[0].location)
#print(object.location)

rotation_rate = 2 
nmax = 6
cutaway = False
auto_scale_particles = 1

#correction exponent - set to 0 for all orbitals with the same number of points
# set to 3 for all orbitals with the same density of points
points_exponent = .4
vol_max = (3/2*nmax**2)**points_exponent

def particleSetter(scene, degp):
    #import scene parameters
    scene = bpy.context.scene
    cFrame = scene.frame_current
    sFrame = scene.frame_start


    for n in range(1,nmax+1):
    
        lmax = n-1
        
        #change the color of the particles
        color = mathutils.Color((.9, .0, .05))
        color.h = ((230-(n-1)*41) % 360)/360
        color_total = color.r+color.g+color.b        
        
        bpy.data.materials["Material.00"+str(n)].node_tree.nodes["Principled BSDF"].inputs[0].default_value = (color.r/color_total, color.g/color_total, color.b/color_total,1)
        
        
        for l in range(0,lmax+1):
            
            #change the color of the particles more subtly - this only works if we make a separate icosphere for every single n,l value, too!
            #color.h = ((220 - (n-1) * 60 - (l+1)/n*60)% 360)/360
           
            
            #bpy.data.materials["Material.001"].diffuse_color = colorsys.hsv_to_rgb(0, 0.8, 1)
            
            for m in range(0,l+1,1):
                orbital=str(n)+" "+str(l)+" "+str(m)
                #print(orbital)        
                
                # Select the correct object
                object = bpy.context.scene.objects[orbital+" points"]       # Get the object
                
                #transform offset for translating to local coordinates
                xyz_offset = object.location               
                
                particle_systems = object.evaluated_get(degp).particle_systems
                #print(particle_systems[0])
                
                #check if the orbital has a particle system
                if 0 < len(particle_systems):
                    
                    particles = particle_systems[0].particles

#                    #at start-frame, clear the particle cache
#                    if cFrame == sFrame:
#                        psSeed = object.particle_systems[0].seed 
#                        object.particle_systems[0].seed  = psSeed

                    #update particle positions    
                    for particle in particles:
                                            
                        #get radial particle location (relative to local origin) and define rotation matrix
                        rho = sqrt((particle.location[0]-xyz_offset[0])**2 + (particle.location[1]-xyz_offset[1])**2)
                        r = sqrt((particle.location[0]-xyz_offset[0])**2 + (particle.location[1]-xyz_offset[1])**2+(particle.location[2]-xyz_offset[2])**2)
                        
                    
                    
                        z = particle.location[2]-xyz_offset[2]
                        
                         #associated legendre polynomial
                         #NOTE: the position of the parameters is reversed from Mathematica
                        #scipy.special.lpmv()
                        #https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.lpmv.html#scipy.special.lpmv
                        
                        #generalized laguerre polynomial
                        #scipy.special.eval_genlaguerre()
                        #https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.eval_genlaguerre.html#scipy.special.eval_genlaguerre
                        
                        
                        #check that n - (l+2) isn't too big (otherwise set to zero)
                        if n-(l+2)<1:
                            dphidt = (1/r**2) *(-l+m+r/n - z/rho*lpmv(m+1,l,z/r)/lpmv(m,l,z/r))
                            
                        else: 
                            #d phi d t (ie, rotation rate)
                            dphidt = (1/r**2) *(-l+m+r/n + 2*r/n *eval_genlaguerre(-2-l+n,2+2*l,2*r/n)/eval_genlaguerre(-1-l+n,1+2*l,2*r/n)- z/rho*lpmv(m+1,l,z/r)/lpmv(m,l,z/r))
                        
                        #define the rotation matrix
                        mat = Matrix.Rotation(rotation_rate*cFrame*dphidt,4,"Z")
                        
                        
                       
                        
                        #apply rotation to translated coordinates, translate back to original location
                        particle.location = mat@(particle.location- xyz_offset) + xyz_offset  
                        
                        #Cutaway particles: Only show particles in a certain area
                        #Note: this must be AFTER redefining of the particle location property of the particle animation script
                        if cutaway == True:
                            x = particle.location[0]-xyz_offset[0]
                            y = particle.location[1]-xyz_offset[1]
                            z = particle.location[2]-xyz_offset[2]
                            
                            ## cut away a vertical wedge facing the camera
                            #if particle.location[1]-xyz_offset[1]+1.5*abs(particle.location[0]-xyz_offset[0])>0:
                            ## cut away the hemisphere facing the camera
                            if y>0:
                            ## cut away a horizontal upper quadrant/wedge facing the camera
                            #if not (y<0 and z>0):
                            ## cut away the upper hemisphere
                            #if z<0:
                            ## cut away an octant wedge with orientation facing the camera (orientation = 0) or to the right (orientation = 1)
                            #octant_orientation = .5
                            #if not( -octant_orientation*x+y + abs(x+octant_orientation*y) < 0 and z > 0):
                            
                                particle.size = 1.5*auto_scale_particles/vol_max*(3/2*n**2-l*(l+1)/2)**points_exponent
                            else:
                                particle.size = 0
                        else:
                            particle.size = 1.5*auto_scale_particles/vol_max*(3/2*n**2-l*(l+1)/2)**points_exponent

#clear the post frame handler
bpy.app.handlers.frame_change_post.clear() 

#run the function on each frame
bpy.app.handlers.frame_change_post.append(particleSetter) 

print(" *** Particle Animation Enabled *** ") 